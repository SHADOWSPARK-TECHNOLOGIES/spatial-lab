/**
 * Pick the preferred provider when it is available, otherwise the next available one.
 * @template {{ id: string, available?: () => boolean }} T
 * @param {readonly T[]} providers
 * @param {string} [preferId]
 * @returns {T}
 */
export function selectProvider(providers, preferId) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("no provider available");
  }
  /** @type {T[]} */
  const ordered = [];
  if (preferId) {
    const preferred = providers.find((provider) => provider.id === preferId);
    if (preferred) ordered.push(preferred);
  }
  for (const provider of providers) {
    if (!ordered.includes(provider)) ordered.push(provider);
  }
  for (const provider of ordered) {
    const available = typeof provider.available === "function" ? provider.available() : true;
    if (available) return provider;
  }
  throw new Error("no provider available");
}
