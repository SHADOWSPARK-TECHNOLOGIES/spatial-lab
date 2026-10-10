import { OPENFREEMAP_ATTRIBUTION, OPENFREEMAP_STYLE_URL, OSM_ATTRIBUTION, OSM_USER_AGENT, PHOTOREALISTIC_CLIENT_ROOT, TERRAIN_ATTRIBUTION } from "./providers.js";
import { PHOTOREALISTIC_KEY, photorealisticEnabled, readServerKey } from "./server-key.js";

/**
 * @typedef {Object} ResolvedTile
 * @property {string} providerId
 * @property {string} host
 * @property {string} href
 * @property {string} clientPath
 * @property {string} attribution
 * @property {Readonly<Record<string, string>>} headers
 */

/**
 * @param {object} request
 * @param {string} request.providerId
 * @param {number} request.z
 * @param {number} request.x
 * @param {number} request.y
 * @param {string} [request.url]
 * @param {object} [options]
 * @param {string} [options.url]
 * @returns {ResolvedTile}
 */
export function resolveTile(request, options = {}) {
  refuseUserUrl(request);
  refuseUserUrl(options);
  const spec = TILES[request.providerId];
  if (!spec) throw new Error("unknown tile provider");
  if (!spec.available()) throw new Error("provider unavailable");
  assertTileCoord(request.z, request.x, request.y, spec.maxZoom);
  return Object.freeze({
    providerId: request.providerId,
    host: spec.host,
    href: spec.href(request.z, request.x, request.y),
    clientPath: `/map/tiles/${request.providerId}/${request.z}/${request.x}/${request.y}.png`,
    attribution: spec.attribution,
    headers: Object.freeze({ ...spec.headers }),
  });
}

/**
 * @param {string} providerId
 * @param {object} [options]
 * @param {string} [options.url]
 */
export function resolveStyle(providerId, options = {}) {
  refuseUserUrl(options);
  if (providerId !== "openfreemap-liberty") throw new Error("no style for provider");
  return Object.freeze({
    providerId,
    host: "tiles.openfreemap.org",
    href: OPENFREEMAP_STYLE_URL,
    clientPath: "/map/styles/openfreemap-liberty",
    attribution: OPENFREEMAP_ATTRIBUTION,
  });
}

/**
 * Server-only Google root. `href` carries the key. `clientPath` does not.
 * @param {object} [options]
 * @param {Record<string, unknown>} [options.serverEnv]
 * @param {string} [options.url]
 */
export function resolvePhotorealisticRoot(options = {}) {
  refuseUserUrl(options);
  const key = readServerKey(options.serverEnv, PHOTOREALISTIC_KEY);
  if (!key || !photorealisticEnabled(options.serverEnv)) throw new Error("photorealistic provider unavailable");
  return Object.freeze({
    host: "tile.googleapis.com",
    href: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(key)}`,
    clientPath: PHOTOREALISTIC_CLIENT_ROOT,
  });
}

/**
 * @param {{ providerId: string, z: number, x: number, y: number, url?: string }} request
 * @param {{ fetchImpl?: (url: string, init: { method: string, headers: Record<string, string>, signal?: AbortSignal }) => Promise<{ ok: boolean, arrayBuffer: () => Promise<ArrayBuffer> }>, signal?: AbortSignal, url?: string }} [options]
 */
export async function fetchProxiedTile(request, options = {}) {
  refuseUserUrl(request);
  refuseUserUrl(options);
  const resolved = resolveTile(request);
  if (typeof options.fetchImpl !== "function") throw new Error("fetchImpl required");
  const response = await options.fetchImpl(resolved.href, {
    method: "GET",
    headers: { ...resolved.headers },
    signal: options.signal,
  });
  if (!response.ok) return { ok: false, tile: null, attribution: resolved.attribution };
  const tile = await response.arrayBuffer();
  if (tile.byteLength > 2_000_000) return { ok: false, tile: null, attribution: resolved.attribution };
  return { ok: true, tile, attribution: resolved.attribution };
}

/**
 * @param {object | undefined} value
 */
function refuseUserUrl(value) {
  if (value && Object.prototype.hasOwnProperty.call(value, "url")) {
    throw new Error("user-supplied URL is not fetched");
  }
}

/**
 * @param {number} z
 * @param {number} x
 * @param {number} y
 * @param {number} maxZoom
 */
function assertTileCoord(z, x, y, maxZoom) {
  if (!Number.isInteger(z) || z < 0 || z > maxZoom) throw new Error("tile out of range");
  const limit = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= limit || y >= limit) {
    throw new Error("tile out of range");
  }
}

/** @type {Record<string, { host: string, maxZoom: number, attribution: string, headers: Record<string, string>, available: () => boolean, href: (z: number, x: number, y: number) => string }>} */
const TILES = {
  "osm-raster": {
    host: "tile.openstreetmap.org",
    maxZoom: 19,
    attribution: OSM_ATTRIBUTION,
    headers: { "user-agent": OSM_USER_AGENT },
    available: () => true,
    /** @param {number} z @param {number} x @param {number} y */
    href(z, x, y) {
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    },
  },
  "aws-terrarium": {
    host: "s3.amazonaws.com",
    maxZoom: 15,
    attribution: TERRAIN_ATTRIBUTION,
    headers: {},
    available: () => true,
    /** @param {number} z @param {number} x @param {number} y */
    href(z, x, y) {
      return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    },
  },
  "aws-terrarium-eu": {
    host: "s3.amazonaws.com",
    maxZoom: 15,
    attribution: TERRAIN_ATTRIBUTION,
    headers: {},
    available: () => false,
    /** @param {number} z @param {number} x @param {number} y */
    href(z, x, y) {
      return `https://s3.amazonaws.com/elevation-tiles-prod-eu/terrarium/${z}/${x}/${y}.png`;
    },
  },
};
