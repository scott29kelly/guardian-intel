/**
 * Google Street View Service
 * 
 * Provides Street View imagery for customer property addresses.
 * Uses Google Maps Street View Static API.
 * 
 * API Key required: GOOGLE_MAPS_API_KEY in .env.local
 * Enable "Street View Static API" in Google Cloud Console
 * 
 * Caching: Street View URLs cached for 1 hour
 */

import { 
  cacheGet, 
  cacheSet, 
  buildCacheKey, 
  hashString, 
  CACHE_TTL 
} from "@/lib/cache";

export interface StreetViewOptions {
  width?: number;
  height?: number;
  heading?: number;    // Camera direction (0-360, 0=North)
  pitch?: number;      // Camera angle (-90 to 90, 0=horizontal)
  fov?: number;        // Field of view (10-120, default 90)
}

export interface StreetViewResult {
  imageUrl: string;
  metadataUrl: string;
  hasStreetView: boolean;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface CachedStreetViewData {
  imageUrl: string;
  available: boolean;
  location?: { lat: number; lng: number };
  panoId?: string;
  cachedAt: number;
}

const DEFAULT_OPTIONS: StreetViewOptions = {
  width: 600,
  height: 400,
  heading: 0,
  pitch: 10,
  fov: 90,
};

/**
 * Generate a Street View image URL for an address
 */
export function getStreetViewImageUrl(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  options: StreetViewOptions = {}
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const fullAddress = encodeURIComponent(`${address}, ${city}, ${state} ${zipCode}`);
  
  // If no API key, return a placeholder
  if (!apiKey) {
    return getPlaceholderUrl(opts.width!, opts.height!, `${city}, ${state}`);
  }
  
  const params = new URLSearchParams({
    size: `${opts.width}x${opts.height}`,
    location: `${address}, ${city}, ${state} ${zipCode}`,
    heading: opts.heading!.toString(),
    pitch: opts.pitch!.toString(),
    fov: opts.fov!.toString(),
    key: apiKey,
  });
  
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Generate a Street View image URL using coordinates
 */
export function getStreetViewImageUrlByCoords(
  lat: number,
  lng: number,
  options: StreetViewOptions = {}
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!apiKey) {
    return getPlaceholderUrl(opts.width!, opts.height!, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }
  
  const params = new URLSearchParams({
    size: `${opts.width}x${opts.height}`,
    location: `${lat},${lng}`,
    heading: opts.heading!.toString(),
    pitch: opts.pitch!.toString(),
    fov: opts.fov!.toString(),
    key: apiKey,
  });
  
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Check if Street View is available for a location
 * Returns metadata about the nearest Street View panorama
 * 
 * Uses caching to avoid repeated API calls (1 hour TTL)
 */
export async function checkStreetViewAvailability(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<{ available: boolean; location?: { lat: number; lng: number }; panoId?: string }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    // In development without API key, assume available
    return { available: true };
  }

  // Check cache first
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const addressHash = hashString(fullAddress);
  const cacheKey = buildCacheKey("streetView", "availability", addressHash);
  
  const cached = await cacheGet<{ available: boolean; location?: { lat: number; lng: number }; panoId?: string }>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  const encodedAddress = encodeURIComponent(fullAddress);
  const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodedAddress}&key=${apiKey}`;
  
  try {
    const response = await fetch(metadataUrl);
    const data = await response.json();
    
    let result: { available: boolean; location?: { lat: number; lng: number }; panoId?: string };
    
    if (data.status === "OK") {
      result = {
        available: true,
        location: data.location,
        panoId: data.pano_id,
      };
    } else {
      result = { available: false };
    }
    
    // Cache the result
    await cacheSet(cacheKey, result, CACHE_TTL.streetView);
    
    return result;
  } catch (error) {
    console.error("[StreetView] Error checking availability:", error);
    return { available: false };
  }
}

/**
 * Generate a placeholder image URL when no API key is configured
 */
function getPlaceholderUrl(width: number, height: number, label: string): string {
  // Use a simple gradient placeholder with text
  // In production, you might use a service like placeholder.com or generate SVG
  const encodedLabel = encodeURIComponent(label);
  return `https://placehold.co/${width}x${height}/1a1a2e/00d4ff?text=${encodedLabel}`;
}

/**
 * Get multiple Street View angles for a property
 * Useful for showing front, left, right views
 */
export function getMultiAngleStreetView(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  options: StreetViewOptions = {}
): { front: string; left: string; right: string } {
  const baseHeading = options.heading || 0;
  
  return {
    front: getStreetViewImageUrl(address, city, state, zipCode, {
      ...options,
      heading: baseHeading,
    }),
    left: getStreetViewImageUrl(address, city, state, zipCode, {
      ...options,
      heading: (baseHeading + 270) % 360,
    }),
    right: getStreetViewImageUrl(address, city, state, zipCode, {
      ...options,
      heading: (baseHeading + 90) % 360,
    }),
  };
}

/**
 * Generate embed URL for interactive Street View
 */
export function getStreetViewEmbedUrl(
  address: string,
  city: string,
  state: string,
  zipCode: string
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const fullAddress = encodeURIComponent(`${address}, ${city}, ${state} ${zipCode}`);
  
  if (!apiKey) {
    return "";
  }
  
  return `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${fullAddress}`;
}

/**
 * Get cached Street View data for an address
 * Returns image URL and availability status, caching for 1 hour
 * 
 * This is the main function for server-side Street View handling with caching
 */
export async function getCachedStreetViewData(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  options: StreetViewOptions = {}
): Promise<CachedStreetViewData> {
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const addressHash = hashString(fullAddress);
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const optionsHash = hashString(`${opts.width}x${opts.height}-${opts.heading}-${opts.pitch}-${opts.fov}`);
  const cacheKey = buildCacheKey("streetView", "data", addressHash, optionsHash);
  
  // Check cache first
  const cached = await cacheGet<CachedStreetViewData>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Check availability first
  const availability = await checkStreetViewAvailability(address, city, state, zipCode);
  
  // Generate image URL
  const imageUrl = getStreetViewImageUrl(address, city, state, zipCode, options);
  
  const data: CachedStreetViewData = {
    imageUrl,
    available: availability.available,
    location: availability.location,
    panoId: availability.panoId,
    cachedAt: Date.now(),
  };
  
  // Cache the result
  await cacheSet(cacheKey, data, CACHE_TTL.streetView);
  
  return data;
}

/**
 * Invalidate Street View cache for an address
 */
export async function invalidateStreetViewCache(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<void> {
  const { cacheDel } = await import("@/lib/cache");
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const addressHash = hashString(fullAddress);
  
  // Delete availability cache
  const availabilityCacheKey = buildCacheKey("streetView", "availability", addressHash);
  await cacheDel(availabilityCacheKey);
  
  // Note: Data caches with different options won't be cleared, but they'll expire
}
