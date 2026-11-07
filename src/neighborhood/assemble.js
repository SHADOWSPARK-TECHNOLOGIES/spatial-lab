import { assertPin } from "./catalog.js";
import { loadAmenities } from "./overpass.js";

// Must match an id in docs/DATA_SOURCES.md.
export const SOURCE_ID = "osm-overpass-extract";

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

// Emits exactly the docs/V0_CONTRACT.md shape: { property: {lat, lng}, items: [...] }.
// No ok/stale/attribution keys: those are loader-internal; ODbL attribution is
// attached at the API edge. On loader failure the item list is empty.
export async function assembleNeighborhood(pin, radiusM, options = {}) {
  assertPin(pin);
  const loaded = await loadAmenities(pin, { ...options, radiusM });
  const items = loaded.amenities
    .map((a) => ({
      name: a.name,
      category: a.layer,
      lat: a.latitude,
      lng: a.longitude,
      distance_m: haversineMeters(pin.latitude, pin.longitude, a.latitude, a.longitude),
      source_id: SOURCE_ID,
      kind: "source",
    }))
    .sort((x, y) => x.distance_m - y.distance_m);
  return { property: { lat: pin.latitude, lng: pin.longitude }, items };
}
