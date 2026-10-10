/** @typedef {"mercator" | "globe"} MapProjection */

/**
 * @typedef {Object} MapCenter
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * Explicit camera. `pitch` and `tilt` are the same angle in degrees.
 * MapLibre calls it pitch. Some 3D SDKs call it tilt.
 * @typedef {Object} CameraState
 * @property {MapProjection} projection
 * @property {MapCenter} center
 * @property {number} zoom
 * @property {number} pitch
 * @property {number} tilt
 * @property {number} bearing
 */

/**
 * @typedef {Object} LngLatBounds
 * @property {number} west
 * @property {number} south
 * @property {number} east
 * @property {number} north
 */

/**
 * @typedef {Object} FitViewport
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [padding]
 */

export const ZOOM_MIN = 0;
export const ZOOM_MAX = 22;
export const PITCH_MIN = 0;
export const PITCH_MAX = 85;
const TILE_SIZE = 512;

/** City-level Owerri view. Not the Phase 2 sample pin. */
export const MAP_RESET = Object.freeze({
  projection: /** @type {const} */ ("mercator"),
  center: Object.freeze({ latitude: 5.48, longitude: 7.03 }),
  zoom: 12,
  pitch: 0,
  tilt: 0,
  bearing: 0,
});

export const GLOBE_RESET = Object.freeze({
  projection: /** @type {const} */ ("globe"),
  center: Object.freeze({ latitude: 0, longitude: 0 }),
  zoom: 1.5,
  pitch: 0,
  tilt: 0,
  bearing: 0,
});

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {string} label
 */
function clamp(value, min, max, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} out of range`);
  }
  return Math.min(max, Math.max(min, value));
}

/** @param {number} value */
export function wrapBearing(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("bearing out of range");
  }
  return ((value % 360) + 360) % 360;
}

/** @param {MapCenter} center */
export function assertCenter(center) {
  if (!center || typeof center.latitude !== "number" || typeof center.longitude !== "number") {
    throw new Error("center required");
  }
  if (!Number.isFinite(center.latitude) || center.latitude < -90 || center.latitude > 90) {
    throw new Error("latitude out of range");
  }
  if (!Number.isFinite(center.longitude) || center.longitude < -180 || center.longitude > 180) {
    throw new Error("longitude out of range");
  }
}

/**
 * @param {Partial<CameraState> & { center?: MapCenter }} [partial]
 * @returns {CameraState}
 */
export function createCamera(partial = {}) {
  const pitch = clamp(partial.pitch ?? partial.tilt ?? 0, PITCH_MIN, PITCH_MAX, "pitch");
  const center = partial.center ?? { latitude: MAP_RESET.center.latitude, longitude: MAP_RESET.center.longitude };
  assertCenter(center);
  const projection = partial.projection === "globe" ? "globe" : "mercator";
  return Object.freeze({
    projection,
    center: Object.freeze({ latitude: center.latitude, longitude: center.longitude }),
    zoom: clamp(partial.zoom ?? MAP_RESET.zoom, ZOOM_MIN, ZOOM_MAX, "zoom"),
    pitch,
    tilt: pitch,
    bearing: wrapBearing(partial.bearing ?? 0),
  });
}

/**
 * @param {CameraState} camera
 * @param {number} tilt
 * @returns {CameraState}
 */
export function setTilt(camera, tilt) {
  return createCamera({ ...camera, pitch: tilt, tilt });
}

/**
 * @param {CameraState} camera
 * @param {number} pitch
 * @returns {CameraState}
 */
export function setPitch(camera, pitch) {
  return createCamera({ ...camera, pitch, tilt: pitch });
}

/**
 * @param {CameraState} camera
 * @param {number} bearing
 * @returns {CameraState}
 */
export function setBearing(camera, bearing) {
  return createCamera({ ...camera, bearing });
}

/** @param {CameraState} camera */
export function northUp(camera) {
  return setBearing(camera, 0);
}

/** @returns {CameraState} */
export function resetMap() {
  return createCamera(MAP_RESET);
}

/** @returns {CameraState} */
export function resetGlobe() {
  return createCamera(GLOBE_RESET);
}

/** @param {number} latitude */
function mercatorY(latitude) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

/**
 * @param {LngLatBounds} bounds
 * @param {FitViewport} [viewport]
 * @returns {CameraState}
 */
export function fitBounds(bounds, viewport = {}) {
  if (!bounds) throw new Error("bounds required");
  for (const key of /** @type {const} */ (["west", "south", "east", "north"])) {
    if (typeof bounds[key] !== "number" || !Number.isFinite(bounds[key])) {
      throw new Error("bounds out of range");
    }
  }
  if (bounds.south > bounds.north || bounds.south < -90 || bounds.north > 90) {
    throw new Error("bounds out of range");
  }
  let lngSpan = bounds.east - bounds.west;
  if (lngSpan <= 0) lngSpan += 360;
  if (lngSpan <= 0 || lngSpan > 360) throw new Error("bounds out of range");
  const latFraction = Math.abs(mercatorY(bounds.south) - mercatorY(bounds.north));
  const lngFraction = lngSpan / 360;
  if (latFraction === 0 || lngFraction === 0) throw new Error("bounds empty");
  const width = viewport.width ?? 1024;
  const height = viewport.height ?? 768;
  const padding = viewport.padding ?? 32;
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const zoomLng = Math.log2(innerWidth / TILE_SIZE / lngFraction);
  const zoomLat = Math.log2(innerHeight / TILE_SIZE / latFraction);
  let longitude = bounds.west + lngSpan / 2;
  if (longitude > 180) longitude -= 360;
  if (longitude < -180) longitude += 360;
  return createCamera({
    projection: "mercator",
    center: { latitude: (bounds.south + bounds.north) / 2, longitude },
    zoom: Math.min(zoomLng, zoomLat),
    pitch: 0,
    tilt: 0,
    bearing: 0,
  });
}

/**
 * @typedef {Object} CameraControl
 * @property {"tilt" | "pitch" | "bearing" | "north-up" | "fit-bounds" | "reset-map" | "reset-globe"} type
 * @property {number} [degrees]
 * @property {LngLatBounds} [bounds]
 * @property {FitViewport} [viewport]
 */

/**
 * @param {CameraState} camera
 * @param {CameraControl} control
 * @returns {CameraState}
 */
export function applyCameraControl(camera, control) {
  switch (control.type) {
    case "tilt":
      return setTilt(camera, requiredDegrees(control));
    case "pitch":
      return setPitch(camera, requiredDegrees(control));
    case "bearing":
      return setBearing(camera, requiredDegrees(control));
    case "north-up":
      return northUp(camera);
    case "fit-bounds":
      if (!control.bounds) throw new Error("bounds required");
      return fitBounds(control.bounds, control.viewport);
    case "reset-map":
      return resetMap();
    case "reset-globe":
      return resetGlobe();
    default:
      throw new Error("unknown camera control");
  }
}

/** @param {CameraControl} control */
function requiredDegrees(control) {
  if (typeof control.degrees !== "number") throw new Error("degrees required");
  return control.degrees;
}

/**
 * MapLibre camera arrays are `[longitude, latitude]`.
 * @param {CameraState} camera
 */
export function toMapLibreCamera(camera) {
  return Object.freeze({
    center: Object.freeze([camera.center.longitude, camera.center.latitude]),
    zoom: camera.zoom,
    pitch: camera.pitch,
    bearing: camera.bearing,
  });
}
