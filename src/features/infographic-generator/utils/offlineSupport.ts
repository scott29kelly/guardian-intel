/**
 * Offline Support Utilities for Infographic Generator
 *
 * Provides Cache API-based PNG storage for generated infographics,
 * WiFi awareness via navigator.onLine and online/offline events,
 * and LRU-style cache pruning to limit storage usage.
 *
 * Uses the browser Cache API directly (not the server-side Upstash cache).
 * Service worker serves cached entries via CacheFirst strategy.
 */

const INFOGRAPHIC_CACHE_NAME = "infographic-images-v1";
const MAX_CACHED_ITEMS = 50;
const CACHE_URL_PREFIX = "/infographics/cache";

/**
 * Build a synthetic cache URL key for a given customer + preset pair.
 */
function buildCacheUrl(customerId: string, presetId: string): string {
  return `${CACHE_URL_PREFIX}/${customerId}/${presetId}`;
}

/**
 * Convert a base64 image string to a Blob.
 * Handles both raw base64 and data URL formats.
 */
function base64ToBlob(base64: string): Blob {
  // Strip data URL prefix if present
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "image/png" });
}

/**
 * Convert a Blob to a base64 data URL string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Prune the cache to stay within MAX_CACHED_ITEMS.
 * Removes oldest entries first based on X-Cached-At header (LRU-style).
 */
async function pruneCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_ITEMS) {
    return;
  }

  // Collect entries with their cached-at timestamps
  const entries: Array<{ request: Request; cachedAt: number }> = [];
  for (const request of keys) {
    const response = await cache.match(request);
    const cachedAt = response?.headers.get("X-Cached-At");
    entries.push({
      request,
      cachedAt: cachedAt ? new Date(cachedAt).getTime() : 0,
    });
  }

  // Sort oldest first
  entries.sort((a, b) => a.cachedAt - b.cachedAt);

  // Delete oldest entries until we are at the limit
  const toRemove = entries.length - MAX_CACHED_ITEMS;
  for (let i = 0; i < toRemove; i++) {
    await cache.delete(entries[i].request);
  }
}

/**
 * Cache a generated infographic PNG for offline access.
 *
 * @param customerId - The customer ID this infographic belongs to
 * @param presetId - The preset/template ID used for generation
 * @param imageData - Base64-encoded PNG image data (raw or data URL)
 */
export async function cacheInfographic(
  customerId: string,
  presetId: string,
  imageData: string,
): Promise<void> {
  const cache = await caches.open(INFOGRAPHIC_CACHE_NAME);
  const url = buildCacheUrl(customerId, presetId);
  const blob = base64ToBlob(imageData);

  const response = new Response(blob, {
    headers: {
      "Content-Type": "image/png",
      "X-Cached-At": new Date().toISOString(),
    },
  });

  await cache.put(url, response);
  await pruneCache(cache);
}

/**
 * Retrieve a cached infographic as a base64 data URL.
 *
 * @param customerId - The customer ID
 * @param presetId - The preset/template ID
 * @returns Base64 data URL string, or null if not cached
 */
export async function getCachedInfographic(
  customerId: string,
  presetId: string,
): Promise<string | null> {
  const cache = await caches.open(INFOGRAPHIC_CACHE_NAME);
  const url = buildCacheUrl(customerId, presetId);
  const response = await cache.match(url);

  if (!response) {
    return null;
  }

  const blob = await response.blob();
  return blobToBase64(blob);
}

/**
 * List all cached infographics for a specific customer.
 *
 * @param customerId - The customer ID to filter by
 * @returns Array of cached preset entries with their cache timestamps
 */
export async function getCachedInfographicsForCustomer(
  customerId: string,
): Promise<Array<{ presetId: string; cachedAt: string }>> {
  const cache = await caches.open(INFOGRAPHIC_CACHE_NAME);
  const keys = await cache.keys();
  const prefix = `${CACHE_URL_PREFIX}/${customerId}/`;
  const results: Array<{ presetId: string; cachedAt: string }> = [];

  for (const request of keys) {
    const requestUrl = new URL(request.url, "https://localhost");
    if (requestUrl.pathname.startsWith(prefix)) {
      const presetId = requestUrl.pathname.slice(prefix.length);
      const response = await cache.match(request);
      const cachedAt = response?.headers.get("X-Cached-At") || "";
      results.push({ presetId, cachedAt });
    }
  }

  return results;
}

/**
 * Clear cached infographics.
 *
 * @param customerId - If provided, only clear that customer's entries.
 *                     If omitted, delete the entire infographic cache.
 */
export async function clearCachedInfographics(
  customerId?: string,
): Promise<void> {
  if (!customerId) {
    await caches.delete(INFOGRAPHIC_CACHE_NAME);
    return;
  }

  const cache = await caches.open(INFOGRAPHIC_CACHE_NAME);
  const keys = await cache.keys();
  const prefix = `${CACHE_URL_PREFIX}/${customerId}/`;

  for (const request of keys) {
    const requestUrl = new URL(request.url, "https://localhost");
    if (requestUrl.pathname.startsWith(prefix)) {
      await cache.delete(request);
    }
  }
}

/**
 * Check if the browser currently has network connectivity.
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Subscribe to connectivity changes (online/offline events).
 *
 * @param callback - Called with true when online, false when offline
 * @returns Cleanup function to remove the event listeners
 */
export function onConnectivityChange(
  callback: (online: boolean) => void,
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
