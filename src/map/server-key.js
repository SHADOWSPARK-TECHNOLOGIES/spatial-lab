import { PHOTOREALISTIC_COMMERCIAL_USE } from "./providers.js";

export const PHOTOREALISTIC_KEY = "GOOGLE_MAP_TILES_KEY";

/**
 * Read one server-side credential. Returns null when it is missing.
 * The value stays with the caller. Client modules do not import this file.
 * @param {unknown} serverEnv
 * @param {string} name
 * @returns {string | null}
 */
export function readServerKey(serverEnv, name) {
  if (serverEnv == null) return null;
  if (typeof serverEnv !== "object") throw new Error("serverEnv must be an object");
  const value = /** @type {Record<string, unknown>} */ (serverEnv)[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const PHOTOREALISTIC_FLAG = "ENABLE_GOOGLE_PHOTOREALISTIC_3D";

/**
 * google-photorealistic-3d is enabled only when the server passes both the key and
 * ENABLE_GOOGLE_PHOTOREALISTIC_3D=true. With NODE_ENV=production it also needs
 * commercialUse === "APPROVED_COMMERCIAL" (currently UNKNOWN, so it stays off).
 * @param {unknown} serverEnv
 * @param {{ commercialUse?: string }} [options]
 * @returns {boolean}
 */
export function photorealisticEnabled(serverEnv, options = {}) {
  if (readServerKey(serverEnv, PHOTOREALISTIC_KEY) === null) return false;
  if (readServerKey(serverEnv, PHOTOREALISTIC_FLAG) !== "true") return false;
  const commercialUse = options.commercialUse ?? PHOTOREALISTIC_COMMERCIAL_USE;
  if (readServerKey(serverEnv, "NODE_ENV") === "production" && commercialUse !== "APPROVED_COMMERCIAL") return false;
  return true;
}
