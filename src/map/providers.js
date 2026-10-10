/** @typedef {"none" | "server" | "public-client-token"} KeyExposure */
/** @typedef {"basemap" | "terrain" | "3d"} ProviderRole */
/** @typedef {"terrain-mesh" | "photorealistic"} ThreeDMode */

/**
 * @typedef {Object} ClientView
 * @property {string} id
 * @property {ProviderRole} role
 * @property {string} label
 * @property {string} attribution
 * @property {KeyExposure} keyExposure
 * @property {boolean} [optional]
 * @property {boolean} [scoped]
 * @property {string} [tokenScope]
 * @property {string} [styleUrl]
 * @property {"style-url" | "raster" | "raster-dem" | "3d-tiles"} [type]
 * @property {readonly string[]} [tiles]
 * @property {number} [tileSize]
 * @property {string} [encoding]
 * @property {string} [rootPath]
 * @property {string} [unavailableReason]
 * @property {ThreeDMode} [mode]
 */

/**
 * @typedef {Object} MapProvider
 * @property {string} id
 * @property {"basemap"} role
 * @property {string} label
 * @property {string} attribution
 * @property {KeyExposure} keyExposure
 * @property {readonly string[]} fixedHosts
 * @property {() => boolean} available
 * @property {() => ClientView} clientView
 */

/**
 * @typedef {Object} TerrainProvider
 * @property {string} id
 * @property {"terrain"} role
 * @property {string} label
 * @property {string} attribution
 * @property {KeyExposure} keyExposure
 * @property {"terrarium"} encoding
 * @property {number} maxZoom
 * @property {readonly string[]} fixedHosts
 * @property {() => boolean} available
 * @property {() => ClientView} clientView
 */

/**
 * @typedef {Object} ThreeDProvider
 * @property {string} id
 * @property {"3d"} role
 * @property {ThreeDMode} mode
 * @property {string} label
 * @property {string} attribution
 * @property {KeyExposure} keyExposure
 * @property {boolean} optional
 * @property {string} [commercialUse]
 * @property {readonly string[]} fixedHosts
 * @property {() => boolean} available
 * @property {() => ClientView} clientView
 */

/**
 * @typedef {Object} ProviderRegistry
 * @property {readonly MapProvider[]} basemaps
 * @property {readonly TerrainProvider[]} terrain
 * @property {readonly ThreeDProvider[]} threeD
 */

export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const OPENFREEMAP_ATTRIBUTION = "OpenFreeMap © OpenMapTiles Data from OpenStreetMap";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const TERRAIN_ATTRIBUTION = "Terrain Tiles © Mapzen, AWS Open Data";
export const OSM_USER_AGENT = "ShadowSpark-spatial-lab/3a (research; +https://github.com/SHADOWSPARK-TECHNOLOGIES/spatial-lab)";

export const PHOTOREALISTIC_CLIENT_ROOT = "/map/3d/photorealistic/root.json";
export const PHOTOREALISTIC_ATTRIBUTION = "Google Maps";
/**
 * Licensing class for google-photorealistic-3d. Stays UNKNOWN until the Google
 * Maps Platform terms are reviewed and approved; production needs APPROVED_COMMERCIAL.
 * @type {"APPROVED_COMMERCIAL" | "APPROVED_WITH_ATTRIBUTION" | "DEVELOPMENT_ONLY" | "NON_COMMERCIAL" | "UNKNOWN"}
 */
export const PHOTOREALISTIC_COMMERCIAL_USE = "UNKNOWN";

/** @param {ClientView} view */
export function assertClientView(view) {
  if (view.keyExposure === "public-client-token") {
    if (view.scoped !== true || typeof view.tokenScope !== "string" || view.tokenScope.trim() === "") {
      throw new Error("public client token must be scoped");
    }
  }
  if ("token" in view || "apiKey" in view || "secret" in view) {
    throw new Error("client view contains a secret field");
  }
  return Object.freeze({ ...view });
}

/** @returns {MapProvider} */
export function openFreeMapProvider() {
  return freezeProvider({
    id: "openfreemap-liberty",
    role: "basemap",
    label: "OpenFreeMap Liberty",
    attribution: OPENFREEMAP_ATTRIBUTION,
    keyExposure: "none",
    fixedHosts: ["tiles.openfreemap.org"],
    available: () => true,
    clientView: () =>
      assertClientView({
        id: "openfreemap-liberty",
        role: "basemap",
        label: "OpenFreeMap Liberty",
        attribution: OPENFREEMAP_ATTRIBUTION,
        keyExposure: "none",
        type: "style-url",
        styleUrl: OPENFREEMAP_STYLE_URL,
      }),
  });
}

/** @returns {MapProvider} */
export function osmRasterProvider() {
  return freezeProvider({
    id: "osm-raster",
    role: "basemap",
    label: "OpenStreetMap raster",
    attribution: OSM_ATTRIBUTION,
    keyExposure: "none",
    fixedHosts: ["tile.openstreetmap.org"],
    available: () => true,
    clientView: () =>
      assertClientView({
        id: "osm-raster",
        role: "basemap",
        label: "OpenStreetMap raster",
        attribution: OSM_ATTRIBUTION,
        keyExposure: "none",
        type: "raster",
        tiles: ["/map/tiles/osm-raster/{z}/{x}/{y}.png"],
        tileSize: 256,
      }),
  });
}

/** @returns {TerrainProvider} */
export function awsTerrariumProvider() {
  return freezeProvider({
    id: "aws-terrarium",
    role: "terrain",
    label: "AWS Terrarium DEM",
    attribution: TERRAIN_ATTRIBUTION,
    keyExposure: "none",
    encoding: "terrarium",
    maxZoom: 15,
    fixedHosts: ["s3.amazonaws.com"],
    available: () => true,
    clientView: () =>
      assertClientView({
        id: "aws-terrarium",
        role: "terrain",
        label: "AWS Terrarium DEM",
        attribution: TERRAIN_ATTRIBUTION,
        keyExposure: "none",
        type: "raster-dem",
        encoding: "terrarium",
        tiles: ["/map/tiles/aws-terrarium/{z}/{x}/{y}.png"],
        tileSize: 256,
      }),
  });
}

/** EU mirror is registered and marked unavailable. */
export function awsTerrariumEuProvider() {
  return freezeProvider({
    id: "aws-terrarium-eu",
    role: "terrain",
    label: "AWS Terrarium DEM (EU)",
    attribution: TERRAIN_ATTRIBUTION,
    keyExposure: "none",
    encoding: "terrarium",
    maxZoom: 15,
    fixedHosts: ["s3.amazonaws.com"],
    available: () => false,
    clientView: () =>
      assertClientView({
        id: "aws-terrarium-eu",
        role: "terrain",
        label: "AWS Terrarium DEM (EU)",
        attribution: TERRAIN_ATTRIBUTION,
        keyExposure: "none",
        type: "raster-dem",
        encoding: "terrarium",
        tiles: ["/map/tiles/aws-terrarium-eu/{z}/{x}/{y}.png"],
        tileSize: 256,
        unavailableReason: "eu-mirror-unreachable",
      }),
  });
}

/** @returns {ThreeDProvider} */
export function terrainMeshProvider() {
  return freezeProvider({
    id: "maplibre-terrain-mesh",
    role: "3d",
    mode: "terrain-mesh",
    label: "3D terrain mesh",
    attribution: TERRAIN_ATTRIBUTION,
    keyExposure: "none",
    optional: false,
    fixedHosts: [],
    available: () => true,
    clientView: () =>
      assertClientView({
        id: "maplibre-terrain-mesh",
        role: "3d",
        mode: "terrain-mesh",
        label: "3D terrain mesh",
        attribution: TERRAIN_ATTRIBUTION,
        keyExposure: "none",
        optional: false,
      }),
  });
}

/**
 * Optional photorealistic provider. Availability is a boolean decided by the server.
 * The client view has a same-origin root path and no key.
 * @param {{ available?: boolean }} [options]
 * @returns {ThreeDProvider}
 */
export function photorealisticProvider(options = {}) {
  const available = options.available === true;
  return freezeProvider({
    id: "google-photorealistic-3d",
    role: "3d",
    mode: "photorealistic",
    label: "Photorealistic 3D tiles",
    attribution: PHOTOREALISTIC_ATTRIBUTION,
    keyExposure: "server",
    optional: true,
    commercialUse: PHOTOREALISTIC_COMMERCIAL_USE,
    fixedHosts: ["tile.googleapis.com"],
    available: () => available,
    clientView: () =>
      assertClientView({
        id: "google-photorealistic-3d",
        role: "3d",
        mode: "photorealistic",
        label: "Photorealistic 3D tiles",
        attribution: PHOTOREALISTIC_ATTRIBUTION,
        keyExposure: "server",
        optional: true,
        type: "3d-tiles",
        rootPath: PHOTOREALISTIC_CLIENT_ROOT,
      }),
  });
}

/**
 * @param {{ photorealistic?: boolean }} [options]
 * @returns {ProviderRegistry}
 */
export function createDefaultRegistry(options = {}) {
  return Object.freeze({
    basemaps: Object.freeze([openFreeMapProvider(), osmRasterProvider()]),
    terrain: Object.freeze([awsTerrariumEuProvider(), awsTerrariumProvider()]),
    threeD: Object.freeze([photorealisticProvider({ available: options.photorealistic === true }), terrainMeshProvider()]),
  });
}

/**
 * @template {MapProvider | TerrainProvider | ThreeDProvider} T
 * @param {T} provider
 * @returns {T}
 */
function freezeProvider(provider) {
  return Object.freeze(provider);
}
