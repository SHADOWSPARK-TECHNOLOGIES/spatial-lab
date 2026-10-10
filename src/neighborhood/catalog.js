export const ALLOWED_LAYER_IDS = Object.freeze([
  "property",
  "roads",
  "hospitals",
  "schools",
  "markets",
  "pharmacies",
]);

const BANNED_LAYER_IDS = Object.freeze([
  "flights",
  "military",
  "vessels",
  "satellites",
  "cctv",
  "alpr",
  "radio",
  "cables",
  "firms",
  "earthquakes",
]);

export const SAMPLE_PIN = Object.freeze({
  listingId: "example-12",
  latitude: 5.485,
  longitude: 7.035,
});

/** @param {{ listingId: string, latitude: number, longitude: number }} pin */
export function assertPin(pin) {
  if (!pin || typeof pin.listingId !== "string" || pin.listingId.trim() === "") {
    throw new Error("listingId required");
  }
  if (typeof pin.latitude !== "number" || pin.latitude < -90 || pin.latitude > 90) {
    throw new Error("latitude out of range");
  }
  if (typeof pin.longitude !== "number" || pin.longitude < -180 || pin.longitude > 180) {
    throw new Error("longitude out of range");
  }
}

/** @param {string} id */
export function assertLayerId(id) {
  if (BANNED_LAYER_IDS.includes(id) || !ALLOWED_LAYER_IDS.includes(id)) {
    throw new Error(`layer not allowed: ${id}`);
  }
}

/**
 * @param {{ listingId: string, latitude: number, longitude: number }} pin
 * @param {string} status
 */
export function neighborhoodCatalog(pin, status) {
  assertPin(pin);
  if (status === "error") {
    return { ok: false, pin, layers: [], amenities: [], stale: false };
  }
  if (status === "empty" || status === "stale") {
    return { ok: true, pin, layers: ["property"], amenities: [], stale: status === "stale" };
  }
  if (status !== "ready") {
    throw new Error(`unknown status: ${status}`);
  }
  return {
    ok: true,
    pin,
    layers: [...ALLOWED_LAYER_IDS],
    amenities: [],
    stale: false,
  };
}
