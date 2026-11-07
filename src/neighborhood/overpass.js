import { assertLayerId, assertPin } from "./catalog.js";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const MAX_RADIUS_M = 2000;
export const ATTRIBUTION = "© OpenStreetMap contributors";
export const SOURCE_ID = "osm-overpass-extract";
export const NOTICES = Object.freeze({
  unavailable: "Location information is unavailable right now.",
  empty: "No hospitals, schools, markets, or pharmacies were returned for this pin. Nothing was added to fill the gap.",
  straightLine: "Straight-line distance estimate. This is not a walking or driving route.",
  experimental: "Experimental lab. Not a listing, and not a statement that the area is safe.",
});

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
  // nwr = node + way + relation (amenities are often mapped as areas).
  // Per-type "out center 10;" prevents one category from crowding out others
  // and emits a "center" member for ways/relations.
  const parts = Object.keys(AMENITY_LAYER).map(
    (amenity) =>
      `nwr["amenity"="${amenity}"](around:${radiusM},${pin.latitude},${pin.longitude});\nout center 10;`,
  );
  return `[out:json][timeout:15];\n${parts.join("\n")}`;
}

export function straightLineMeters(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new Error("coordinate out of range");
  }
  const earth = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function contractItems(pin, amenities) {
  assertPin(pin);
  return (amenities ?? []).map((item) => ({
    name: item.name,
    category: item.layer,
    lat: item.latitude,
    lng: item.longitude,
    distance_m: Math.round(straightLineMeters(pin.latitude, pin.longitude, item.latitude, item.longitude)),
    distance_label: "straight-line",
    source_id: SOURCE_ID,
    kind: "source",
  }));
}

function closed(ok, pin, amenities, reason) {
  const items = ok ? contractItems(pin, amenities) : [];
  return {
    ok,
    amenities: ok ? amenities : [],
    items,
    notice: ok ? (items.length ? NOTICES.straightLine : NOTICES.empty) : NOTICES.unavailable,
    label: NOTICES.experimental,
    attribution: ATTRIBUTION,
    stale: false,
    experimental: true,
    reason,
  };
}

export function normalizeElements(elements) {
  const amenities = [];
  for (const element of elements ?? []) {
    const layer = AMENITY_LAYER[element?.tags?.amenity];
    if (!layer) continue;
    assertLayerId(layer);
    // Ways/relations carry coordinates in element.center; nodes carry lat/lon.
    const lat = element?.center?.lat ?? element?.lat;
    const lon = element?.center?.lon ?? element?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    amenities.push({
      id: String(element.id),
      layer,
      name: typeof element.tags?.name === "string" && element.tags.name.trim() ? element.tags.name.trim() : null,
      latitude: lat,
      longitude: lon,
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
  let response;
  try {
    response = await options.fetchImpl(OVERPASS_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: options.signal,
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError" || options.signal?.aborted;
    return closed(false, pin, [], timedOut ? "timeout" : "network");
  }
  if (!response.ok) return closed(false, pin, [], "http");
  let text;
  try {
    text = await response.text();
  } catch (error) {
    const timedOut = error?.name === "AbortError" || options.signal?.aborted;
    return closed(false, pin, [], timedOut ? "timeout" : "network");
  }
  if (text.length > 500_000) return closed(false, pin, [], "oversize");
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return closed(false, pin, [], "parse");
  }
  const amenities = normalizeElements(payload.elements);
  return closed(true, pin, amenities, amenities.length ? "ok" : "empty");
}
