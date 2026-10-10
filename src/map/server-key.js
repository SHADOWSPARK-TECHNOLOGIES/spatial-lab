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
