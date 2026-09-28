import { assertLayerId, assertPin } from "./catalog.js";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const MAX_RADIUS_M = 2000;
export const ATTRIBUTION = "© OpenStreetMap contributors";

const AMENITY_LAYER = Object.freeze({
  hospital: "hospitals",
  school: "schools",
  marketplace: "markets",
  pharmacy: "pharmacies",
});

export function assertRadius(radiusM) {
  if (typeof radiusM !== "number" || !Number.isFinite(radiusM) || radiusM <= 0 || radiusM > MAX_RADIUS_M) {
    throw new Error("radius out of range");
  }
}

export function buildOverpassQuery(pin, radiusM) {
  assertPin(pin);
  assertRadius(radiusM);
  const clauses = Object.keys(AMENITY_LAYER)
    .map((amenity) => `node["amenity"="${amenity}"](around:${radiusM},${pin.latitude},${pin.longitude});`)
    .join("");
  return `[out:json][timeout:15];(${clauses});out body 20;`;
}

export function normalizeElements(elements) {
  const amenities = [];
  for (const element of elements ?? []) {
    const layer = AMENITY_LAYER[element?.tags?.amenity];
    if (!layer) continue;
    assertLayerId(layer);
    if (typeof element.lat !== "number" || typeof element.lon !== "number") continue;
    amenities.push({
      id: String(element.id),
      layer,
      name: element.tags.name || element.tags.amenity,
      latitude: element.lat,
      longitude: element.lon,
      attribution: ATTRIBUTION,
    });
  }
  return amenities;
}

export async function loadAmenities(pin, options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "url")) {
    throw new Error("user-supplied URL is not fetched");
  }
  const query = buildOverpassQuery(pin, options.radiusM);
  if (typeof options.fetchImpl !== "function") throw new Error("fetchImpl required");
  const response = await options.fetchImpl(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: options.signal,
  });
  if (!response.ok) return { ok: false, amenities: [], attribution: ATTRIBUTION, stale: false };
  const text = await response.text();
  if (text.length > 500_000) return { ok: false, amenities: [], attribution: ATTRIBUTION, stale: false };
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, amenities: [], attribution: ATTRIBUTION, stale: false };
  }
  return { ok: true, amenities: normalizeElements(payload.elements), attribution: ATTRIBUTION, stale: false };
}
