import { buildScene } from "./scene.js";
import { PHOTOREALISTIC_KEY, photorealisticEnabled, readServerKey } from "./server-key.js";

/**
 * Build a client scene from an explicit server env object.
 * The key never leaves this function except as a boolean.
 * @param {object} [options]
 * @param {Record<string, unknown>} [options.serverEnv]
 * @param {"2d" | "terrain" | "3d-terrain" | "photorealistic"} [options.mode]
 * @param {string} [options.basemapId]
 * @param {string} [options.terrainId]
 * @param {string} [options.threeDId]
 * @param {import("./camera.js").CameraState} [options.camera]
 * @param {readonly string[]} [options.layers]
 * @param {import("./providers.js").ProviderRegistry} [options.registry]
 */
export function buildServerScene(options = {}) {
  const key = readServerKey(options.serverEnv, PHOTOREALISTIC_KEY);
  const scene = buildScene({
    mode: options.mode,
    basemapId: options.basemapId,
    terrainId: options.terrainId,
    threeDId: options.threeDId,
    camera: options.camera,
    layers: options.layers,
    registry: options.registry,
    photorealistic: photorealisticEnabled(options.serverEnv),
  });
  if (key && JSON.stringify(scene).includes(key)) {
    throw new Error("server key leaked into scene");
  }
  return scene;
}
