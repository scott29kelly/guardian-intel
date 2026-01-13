/**
 * Geocoding Service
 * 
 * Converts addresses to geographic coordinates (latitude/longitude)
 * using the US Census Geocoder API (free, no API key required).
 * 
 * Features:
 * - US Census Geocoder integration
 * - In-memory caching to avoid repeated lookups
 * - Fallback to approximate ZIP code coordinates
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  matchedAddress?: string;
  matchQuality: "exact" | "approximate" | "fallback";
  source: "census" | "cache" | "fallback";
}

interface CacheEntry {
  data: GeocodingResult;
  timestamp: number;
}

// Common ZIP code centroids for fallback (Mid-Atlantic / Ohio focus)
const ZIP_FALLBACK_COORDS: Record<string, { lat: number; lon: number }> = {
  // Ohio - Columbus area
  "43215": { lat: 39.9612, lon: -82.9988 },
  "43017": { lat: 40.0992, lon: -83.1140 },
  "43081": { lat: 40.1262, lon: -82.9296 },
  "43065": { lat: 40.1578, lon: -83.0752 },
  "43068": { lat: 39.9551, lon: -82.8133 },
  "43201": { lat: 39.9889, lon: -83.0034 },
  "43202": { lat: 40.0203, lon: -83.0147 },
  "43204": { lat: 39.9565, lon: -83.0819 },
  "43205": { lat: 39.9565, lon: -82.9563 },
  "43206": { lat: 39.9365, lon: -82.9763 },
  // Pennsylvania
  "18966": { lat: 40.1773, lon: -75.0035 }, // Southampton
  "19104": { lat: 39.9566, lon: -75.1987 }, // Philadelphia
  "15213": { lat: 40.4406, lon: -79.9959 }, // Pittsburgh
  // Default US centroid
  "default": { lat: 39.8283, lon: -98.5795 },
};

class GeocodingService {
  private cache = new Map<string, CacheEntry>();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private censusApiUrl = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

  /**
   * Geocode a full address to coordinates
   */
  async geocode(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<GeocodingResult> {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    const cacheKey = this.normalizeAddress(fullAddress);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, source: "cache" };
    }

    // Try US Census Geocoder
    try {
      const result = await this.geocodeWithCensus(fullAddress);
      if (result) {
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.warn("[Geocoding] Census API failed, using fallback:", error);
    }

    // Fallback to ZIP code centroid
    const fallbackResult = this.getFallbackCoordinates(zipCode);
    this.setCache(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Geocode using US Census Geocoder API
   * Free, no API key required, works for US addresses only
   */
  private async geocodeWithCensus(fullAddress: string): Promise<GeocodingResult | null> {
    const params = new URLSearchParams({
      address: fullAddress,
      benchmark: "Public_AR_Current",
      format: "json",
    });

    const response = await fetch(`${this.censusApiUrl}?${params}`, {
      headers: {
        "Accept": "application/json",
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Census API returned ${response.status}`);
    }

    const data = await response.json();
    const matches = data?.result?.addressMatches;

    if (!matches || matches.length === 0) {
      console.log("[Geocoding] No matches found for:", fullAddress);
      return null;
    }

    const bestMatch = matches[0];
    const coords = bestMatch.coordinates;

    return {
      latitude: coords.y,
      longitude: coords.x,
      matchedAddress: bestMatch.matchedAddress,
      matchQuality: this.assessMatchQuality(bestMatch),
      source: "census",
    };
  }

  /**
   * Assess the quality of a Census API match
   */
  private assessMatchQuality(match: any): GeocodingResult["matchQuality"] {
    const tigerLine = match.tigerLine;
    
    // Exact match has a specific side and position
    if (tigerLine?.side && tigerLine?.tigerLineId) {
      return "exact";
    }
    
    return "approximate";
  }

  /**
   * Get fallback coordinates from ZIP code centroid
   */
  private getFallbackCoordinates(zipCode: string): GeocodingResult {
    const coords = ZIP_FALLBACK_COORDS[zipCode] || ZIP_FALLBACK_COORDS["default"];
    
    return {
      latitude: coords.lat,
      longitude: coords.lon,
      matchQuality: "fallback",
      source: "fallback",
    };
  }

  /**
   * Normalize address for cache key
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Cache helpers
   */
  private getFromCache(key: string): GeocodingResult | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Clean up expired entry
    }
    return null;
  }

  private setCache(key: string, data: GeocodingResult): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Prevent memory leaks - limit cache size
    if (this.cache.size > 10000) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (useful for monitoring)
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.cacheTimeout,
    };
  }
}

// Singleton export
export const geocodingService = new GeocodingService();
