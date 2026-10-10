import { resetGlobe, resetMap } from "./camera.js";
import { selectProvider } from "./fallback.js";
import { assertClientView, createDefaultRegistry } from "./providers.js";
import { serializeShareState } from "./share-state.js";

export const SCENE_MODES = Object.freeze(["2d", "terrain", "3d-terrain", "photorealistic"]);

/**
 * @typedef {import("./camera.js").CameraState} CameraState
 * @typedef {import("./providers.js").ClientView} ClientView
 * @typedef {import("./providers.js").ProviderRegistry} ProviderRegistry
 * @typedef {import("./providers.js").MapProvider} MapProvider
 * @typedef {import("./providers.js").TerrainProvider} TerrainProvider
 * @typedef {import("./providers.js").ThreeDProvider} ThreeDProvider
 */

/**
 * @typedef {Object} SceneRequest
 * @property {"2d" | "terrain" | "3d-terrain" | "photorealistic"} mode
 * @property {string} basemapId
 * @property {string | null} terrainId
 * @property {string | null} threeDId
 * @property {boolean} photorealisticEnabled
 * @property {readonly string[]} layers
 */

/**
 * @typedef {Object} MapScene
 * @property {"2d" | "terrain" | "3d-terrain" | "photorealistic"} mode
 * @property {"2d" | "terrain" | "3d-terrain" | "photorealistic"} requestedMode
 * @property {boolean} fallback
 * @property {CameraState} camera
 * @property {ClientView} basemap
 * @property {ClientView | null} terrain
 * @property {ClientView | null} threeD
 * @property {boolean} hillshade
 * @property {boolean} mesh
 * @property {readonly string[]} layers
 * @property {readonly string[]} attributions
 * @property {SceneRequest} request
 * @property {ReturnType<typeof toMapLibreStyle>} style
 */

/**
 * @param {object} [options]
 * @param {"2d" | "terrain" | "3d-terrain" | "photorealistic"} [options.mode]
 * @param {string} [options.basemapId]
 * @param {string} [options.terrainId]
 * @param {string} [options.threeDId]
 * @param {CameraState} [options.camera]
 * @param {readonly string[]} [options.layers]
 * @param {ProviderRegistry} [options.registry]
 * @param {boolean} [options.photorealistic]
 * @returns {MapScene}
 */
export function buildScene(options = {}) {
  const requestedMode = normalizeMode(options.mode ?? "2d");
  const registry = options.registry ?? createDefaultRegistry({ photorealistic: options.photorealistic === true });
  const basemap = selectProvider(registry.basemaps, options.basemapId);
  const basemapView = assertClientView(basemap.clientView());

  let terrain = /** @type {TerrainProvider | null} */ (null);
  let threeD = /** @type {ThreeDProvider | null} */ (null);
  let mode = requestedMode;

  if (requestedMode === "terrain" || requestedMode === "3d-terrain" || requestedMode === "photorealistic") {
    terrain = selectProvider(registry.terrain, options.terrainId);
  }

  if (requestedMode === "3d-terrain") {
    threeD = selectProvider(
      registry.threeD.filter((provider) => provider.mode === "terrain-mesh"),
      options.threeDId,
    );
  }

  if (requestedMode === "photorealistic") {
    const chosen = selectProvider(registry.threeD, options.threeDId ?? "google-photorealistic-3d");
    threeD = chosen;
    if (chosen.mode !== "photorealistic") {
      mode = "3d-terrain";
    } else {
      terrain = null;
    }
  }

  const hillshade = mode === "terrain";
  const mesh = mode === "3d-terrain";
  const camera = options.camera ?? (mode === "photorealistic" ? resetGlobe() : resetMap());
  const layers = sanitizeSceneLayers(options.layers ?? ["property"]);
  const terrainView = terrain ? assertClientView(terrain.clientView()) : null;
  const threeView = threeD ? assertClientView(threeD.clientView()) : null;
  /** @type {string[]} */
  const attributions = [];
  for (const view of [basemapView, terrainView, threeView]) {
    if (view && !attributions.includes(view.attribution)) attributions.push(view.attribution);
  }

  const request = Object.freeze({
    mode,
    basemapId: basemap.id,
    terrainId: terrain ? terrain.id : null,
    threeDId: threeD ? threeD.id : null,
    photorealisticEnabled: options.photorealistic === true,
    layers,
  });

  /** @type {MapScene} */
  const scene = {
    mode,
    requestedMode,
    fallback: mode !== requestedMode,
    camera,
    basemap: basemapView,
    terrain: terrainView,
    threeD: threeView,
    hillshade,
    mesh,
    layers,
    attributions: Object.freeze(attributions),
    request,
    style: /** @type {MapScene["style"]} */ ({}),
  };
  scene.style = toMapLibreStyle(scene);
  return Object.freeze(scene);
}

/**
 * @param {MapScene} scene
 * @param {object} patch
 * @param {"2d" | "terrain" | "3d-terrain" | "photorealistic"} [patch.mode]
 * @param {string} [patch.basemapId]
 * @param {string} [patch.terrainId]
 * @param {string} [patch.threeDId]
 * @param {CameraState} [patch.camera]
 * @param {readonly string[]} [patch.layers]
 * @param {ProviderRegistry} [patch.registry]
 * @param {boolean} [patch.photorealistic]
 * @returns {MapScene}
 */
export function switchMapSource(scene, patch) {
  return buildScene({
    mode: patch.mode ?? scene.mode,
    basemapId: patch.basemapId ?? scene.request.basemapId,
    terrainId: patch.terrainId ?? scene.request.terrainId ?? undefined,
    threeDId: patch.threeDId ?? scene.request.threeDId ?? undefined,
    camera: patch.camera ?? scene.camera,
    layers: patch.layers ?? scene.layers,
    registry: patch.registry,
    photorealistic: patch.photorealistic ?? scene.request.photorealisticEnabled,
  });
}

/**
 * @param {MapScene} scene
 */
export function toMapLibreStyle(scene) {
  const projection = Object.freeze({ type: scene.camera.projection === "globe" ? "globe" : "mercator" });
  /** @type {Record<string, unknown>} */
  const sources = {};
  /** @type {Record<string, unknown>[]} */
  const layers = [];

  if (scene.basemap.type === "raster" && scene.basemap.tiles) {
    sources.basemap = {
      type: "raster",
      tiles: [...scene.basemap.tiles],
      tileSize: scene.basemap.tileSize ?? 256,
      attribution: scene.basemap.attribution,
    };
    layers.push({ id: "basemap", type: "raster", source: "basemap" });
  }

  if (scene.terrain && scene.terrain.tiles && (scene.hillshade || scene.mesh)) {
    sources.terrain = {
      type: "raster-dem",
      encoding: scene.terrain.encoding ?? "terrarium",
      tiles: [...scene.terrain.tiles],
      tileSize: scene.terrain.tileSize ?? 256,
      attribution: scene.terrain.attribution,
    };
    if (scene.hillshade) {
      layers.push({ id: "hillshade", type: "hillshade", source: "terrain" });
    }
  }

  /** @type {Record<string, unknown>} */
  const style = {
    version: 8,
    sources,
    layers,
    projection,
  };
  if (scene.mesh && scene.terrain) {
    style.terrain = { source: "terrain", exaggeration: 1 };
  }

  return Object.freeze({
    version: 8,
    projection,
    basemap:
      scene.basemap.type === "style-url"
        ? Object.freeze({ kind: "remote-style", url: scene.basemap.styleUrl, keyExposure: scene.basemap.keyExposure })
        : Object.freeze({ kind: "inline", id: scene.basemap.id }),
    terrain: scene.terrain ? Object.freeze({ id: scene.terrain.id, tiles: scene.terrain.tiles }) : null,
    hillshade: scene.hillshade,
    mesh: scene.mesh,
    photorealistic: scene.threeD?.rootPath ? Object.freeze({ rootPath: scene.threeD.rootPath }) : null,
    style: Object.freeze(style),
  });
}

/**
 * @param {string} mode
 * @returns {"2d" | "terrain" | "3d-terrain" | "photorealistic"}
 */
function normalizeMode(mode) {
  if (mode === "2d" || mode === "terrain" || mode === "3d-terrain" || mode === "photorealistic") {
    return mode;
  }
  throw new Error(`unknown mode: ${mode}`);
}

/** @param {readonly string[]} layers */
function sanitizeSceneLayers(layers) {
  const share = serializeShareState({
    center: { latitude: 5.48, longitude: 7.03 },
    zoom: 12,
    pitch: 0,
    bearing: 0,
    layers,
  });
  return share.layers;
}
