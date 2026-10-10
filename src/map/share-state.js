import { ALLOWED_LAYER_IDS } from "../neighborhood/catalog.js";
import { createCamera } from "./camera.js";

const ALLOWED_LAYERS = new Set(ALLOWED_LAYER_IDS);

const FORBIDDEN_KEYS = new Set([
  "token",
  "accessToken",
  "access_token",
  "apiKey",
  "api_key",
  "key",
  "secret",
  "session",
  "sessionId",
  "session_id",
  "cookie",
  "authorization",
  "password",
  "listingId",
  "listing_id",
  "internalId",
  "internal_id",
  "privateLatitude",
  "privateLongitude",
  "exactLatitude",
  "exactLongitude",
  "refreshToken",
  "refresh_token",
  "idToken",
  "id_token",
]);

/**
 * @typedef {Object} PublicEntityRef
 * @property {string} publicId
 */

/**
 * @typedef {Object} ShareState
 * @property {{ latitude: number, longitude: number }} center
 * @property {number} zoom
 * @property {number} pitch
 * @property {number} bearing
 * @property {readonly string[]} layers
 * @property {PublicEntityRef | null} entity
 */

/**
 * @param {unknown} input
 * @returns {ShareState}
 */
export function serializeShareState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("share state required");
  }
  const record = /** @type {Record<string, unknown>} */ (input);
  const privatePoints = collectPrivatePoints(record);
  const forbidden = collectForbiddenStrings(record, privatePoints);
  const centerInput = readCenter(record.center);
  const center = redactPrivateCenter(centerInput, privatePoints);
  const camera = createCamera({
    center,
    zoom: readNumber(record.zoom, "zoom"),
    pitch: readNumber(record.pitch, "pitch"),
    bearing: readNumber(record.bearing, "bearing"),
  });
  const layers = sanitizeLayers(record.layers ?? record.enabledLayers);
  const entity = sanitizeEntity(record.entity ?? record.selectedEntity, forbidden);
  const share = Object.freeze({
    center: camera.center,
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: camera.bearing,
    layers: Object.freeze(layers),
    entity,
  });
  assertForbiddenStringsAbsent(share, forbidden, privatePoints);
  return share;
}

/**
 * @param {unknown} value
 * @param {string} label
 */
function readNumber(value, label) {
  if (typeof value !== "number") throw new Error(`${label} out of range`);
  return value;
}

/** @param {unknown} center */
function readCenter(center) {
  if (!center || typeof center !== "object" || Array.isArray(center)) {
    throw new Error("center required");
  }
  const record = /** @type {Record<string, unknown>} */ (center);
  const latitude = record.latitude ?? record.lat;
  const longitude = record.longitude ?? record.lng ?? record.lon;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("center required");
  }
  return { latitude, longitude };
}

/** @param {unknown} layers */
function sanitizeLayers(layers) {
  if (layers == null) return [];
  if (!Array.isArray(layers)) throw new Error("layers out of range");
  /** @type {string[]} */
  const kept = [];
  for (const layer of layers) {
    if (typeof layer !== "string" || !ALLOWED_LAYERS.has(layer) || kept.includes(layer)) continue;
    kept.push(layer);
  }
  return kept;
}

/**
 * @param {unknown} entity
 * @param {Set<string>} forbidden
 */
function sanitizeEntity(entity, forbidden) {
  if (entity == null) return null;
  if (typeof entity !== "object" || Array.isArray(entity)) return null;
  const record = /** @type {Record<string, unknown>} */ (entity);
  const visibility = record.visibility ?? record.precision;
  if (typeof visibility === "string" && visibility.toLowerCase() !== "public") return null;
  const publicId = record.publicId ?? record.public_id;
  if (typeof publicId !== "string" || publicId.trim() === "") return null;
  const trimmed = publicId.trim();
  if (forbidden.has(trimmed)) return null;
  return Object.freeze({ publicId: trimmed });
}

/**
 * @typedef {{ latitude: number, longitude: number }} Point
 */

/**
 * @param {Record<string, unknown>} input
 * @returns {Point[]}
 */
function collectPrivatePoints(input) {
  /** @type {Point[]} */
  const points = [];
  walk(input, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const record = /** @type {Record<string, unknown>} */ (value);
    if (!isPrivateListing(record)) return;
    const latitude = record.latitude ?? record.lat ?? record.privateLatitude ?? record.exactLatitude;
    const longitude = record.longitude ?? record.lng ?? record.lon ?? record.privateLongitude ?? record.exactLongitude;
    if (typeof latitude === "number" && typeof longitude === "number") {
      points.push({ latitude, longitude });
    }
  });
  return points;
}

/** @param {Record<string, unknown>} record */
function isPrivateListing(record) {
  const visibility = record.visibility ?? record.precision;
  const markedPrivate = typeof visibility === "string" && visibility.toLowerCase() !== "public";
  const hasIdentity = typeof record.listingId === "string" || typeof record.listing_id === "string" || typeof record.internalId === "string" || typeof record.internal_id === "string";
  return markedPrivate || hasIdentity;
}

/**
 * @param {{ latitude: number, longitude: number }} center
 * @param {Point[]} privatePoints
 */
function redactPrivateCenter(center, privatePoints) {
  const hit = privatePoints.some((point) => nearly(point.latitude, center.latitude) && nearly(point.longitude, center.longitude));
  if (!hit) return center;
  return {
    latitude: coarsenDegrees(center.latitude),
    longitude: coarsenDegrees(center.longitude),
  };
}

/** @param {number} value */
function coarsenDegrees(value) {
  const fine = Math.round(value * 100) / 100;
  if (Math.abs(fine - value) > 1e-9) return fine;
  return Math.round(value * 10) / 10;
}

/**
 * @param {number} left
 * @param {number} right
 */
function nearly(left, right) {
  return Math.abs(left - right) < 1e-8;
}

/**
 * @param {unknown} value
 * @param {(value: unknown) => void} visit
 */
function walk(value, visit) {
  if (!value || typeof value !== "object") return;
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  for (const child of Object.values(value)) walk(child, visit);
}

/**
 * @param {unknown} value
 * @param {Point[]} privatePoints
 */
function collectForbiddenStrings(value, privatePoints) {
  /** @type {Set<string>} */
  const found = new Set();
  walk(value, (node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const record = /** @type {Record<string, unknown>} */ (node);
    for (const [key, child] of Object.entries(record)) {
      if (!FORBIDDEN_KEYS.has(key)) continue;
      collectStrings(child, found);
    }
  });
  for (const point of privatePoints) {
    found.add(String(point.latitude));
    found.add(String(point.longitude));
  }
  return found;
}

/**
 * @param {unknown} value
 * @param {Set<string>} found
 */
function collectStrings(value, found) {
  if (typeof value === "string" || typeof value === "number") {
    found.add(String(value));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, found);
    return;
  }
  for (const child of Object.values(value)) collectStrings(child, found);
}

/**
 * @param {ShareState} share
 * @param {Set<string>} forbidden
 * @param {Point[]} privatePoints
 */
function assertForbiddenStringsAbsent(share, forbidden, privatePoints) {
  const text = JSON.stringify(share);
  for (const secret of forbidden) {
    if (secret.length < 6) continue;
    if (text.includes(secret)) throw new Error("share state leaked a forbidden field");
  }
  for (const point of privatePoints) {
    if (nearly(share.center.latitude, point.latitude) && nearly(share.center.longitude, point.longitude)) {
      throw new Error("share state leaked a forbidden field");
    }
  }
}
