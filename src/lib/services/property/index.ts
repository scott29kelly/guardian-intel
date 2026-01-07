/**
 * Property Data Intelligence Service
 * 
 * Aggregates property information from multiple sources:
 * - County assessor records
 * - Real estate APIs (Zillow, Redfin, etc.)
 * - Building permit data
 * - Satellite imagery analysis
 * 
 * Features:
 * - Property details lookup
 * - Roof age estimation
 * - Valuation data
 * - Owner information
 */

export interface PropertyDetails {
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  
  // Coordinates
  latitude?: number;
  longitude?: number;
  
  // Property info
  parcelNumber?: string;
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  lotSize?: number; // acres
  stories?: number;
  bedrooms?: number;
  bathrooms?: number;
  
  // Valuation
  assessedValue?: number;
  marketValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: Date;
  taxAmount?: number;
  
  // Roof details
  roofType?: string;
  roofMaterial?: string;
  roofYear?: number;
  roofAge?: number;
  roofArea?: number;
  roofCondition?: "excellent" | "good" | "fair" | "poor" | "unknown";
  
  // Building materials
  exteriorWall?: string;
  foundation?: string;
  hvacType?: string;
  
  // Owner info
  ownerName?: string;
  ownerMailingAddress?: string;
  ownerOccupied?: boolean;
  
  // Metadata
  source: string;
  lastUpdated: Date;
  confidence: number; // 0-100
  rawData?: Record<string, unknown>;
}

export interface PropertyLookupOptions {
  includeValuation?: boolean;
  includeOwner?: boolean;
  includePermits?: boolean;
  forceRefresh?: boolean;
}

export interface PropertySearchFilters {
  city?: string;
  state?: string;
  zipCode?: string;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  propertyType?: string;
  minValue?: number;
  maxValue?: number;
}

class PropertyDataService {
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private cache = new Map<string, { data: PropertyDetails; timestamp: number }>();

  /**
   * Look up property details by address
   */
  async getPropertyDetails(
    address: string,
    city: string,
    state: string,
    zipCode: string,
    options: PropertyLookupOptions = {}
  ): Promise<PropertyDetails | null> {
    const cacheKey = this.createCacheKey(address, city, state, zipCode);
    
    // Check cache unless force refresh
    if (!options.forceRefresh) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      // In production, this would call multiple APIs:
      // 1. County assessor API
      // 2. Real estate data providers (ATTOM, CoreLogic, etc.)
      // 3. Zillow API
      
      // For now, generate realistic mock data
      const details = await this.fetchPropertyData(address, city, state, zipCode);
      
      if (details) {
        this.setCache(cacheKey, details);
      }
      
      return details;
    } catch (error) {
      console.error("[Property] Error fetching property data:", error);
      return null;
    }
  }

  /**
   * Estimate roof age based on property data and permits
   */
  estimateRoofAge(yearBuilt?: number, lastPermitYear?: number, roofYear?: number): number {
    const currentYear = new Date().getFullYear();
    
    // If we have explicit roof year, use it
    if (roofYear) {
      return currentYear - roofYear;
    }
    
    // If there's a roofing permit, use that
    if (lastPermitYear) {
      return currentYear - lastPermitYear;
    }
    
    // Fall back to building age with typical replacement cycle
    if (yearBuilt) {
      const buildingAge = currentYear - yearBuilt;
      
      // Assume roofs are replaced every 20-25 years
      const avgLifespan = 22;
      const cyclesCompleted = Math.floor(buildingAge / avgLifespan);
      const estimatedRoofAge = buildingAge - (cyclesCompleted * avgLifespan);
      
      return Math.max(0, estimatedRoofAge);
    }
    
    return 0;
  }

  /**
   * Assess roof condition based on available data
   */
  assessRoofCondition(
    roofAge: number,
    roofType?: string,
    recentStorms?: number
  ): PropertyDetails["roofCondition"] {
    // Base condition on age
    let score = 100;
    
    // Age factor
    if (roofAge >= 25) score -= 50;
    else if (roofAge >= 20) score -= 35;
    else if (roofAge >= 15) score -= 20;
    else if (roofAge >= 10) score -= 10;
    
    // Material factor (some materials last longer)
    const materialBonus: Record<string, number> = {
      "metal": 15,
      "tile": 15,
      "slate": 20,
      "architectural shingle": 0,
      "asphalt shingle": -5,
      "3-tab shingle": -10,
    };
    score += materialBonus[roofType?.toLowerCase() || ""] || 0;
    
    // Storm damage factor
    if (recentStorms) {
      score -= recentStorms * 5;
    }
    
    // Map score to condition
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "fair";
    if (score >= 20) return "poor";
    return "poor";
  }

  /**
   * Calculate estimated job value
   */
  calculateEstimatedJobValue(
    roofArea?: number,
    squareFootage?: number,
    roofType?: string,
    stories?: number
  ): number {
    // Estimate roof squares if not provided
    let squares = roofArea || 0;
    if (!squares && squareFootage) {
      // Rough estimate: roof area is ~1.15x footprint for typical pitch
      // Plus overhangs and waste factor
      squares = Math.ceil(squareFootage * 1.15 / 100);
    }
    if (!squares) squares = 25; // Default average home

    // Base price per square
    const basePricePerSquare: Record<string, number> = {
      "3-tab shingle": 350,
      "asphalt shingle": 400,
      "architectural shingle": 450,
      "metal": 700,
      "tile": 900,
      "slate": 1200,
    };
    
    const basePrice = basePricePerSquare[roofType?.toLowerCase() || "architectural shingle"] || 450;
    
    // Story multiplier (access difficulty)
    const storyMultiplier = stories && stories > 1 ? 1 + (stories - 1) * 0.1 : 1;
    
    // Calculate total
    const total = squares * basePrice * storyMultiplier;
    
    // Add typical extras (tear-off, underlayment, flashing, etc.)
    const extrasMultiplier = 1.15;
    
    return Math.round(total * extrasMultiplier);
  }

  /**
   * Bulk lookup for multiple addresses
   */
  async getPropertiesBulk(
    addresses: Array<{ address: string; city: string; state: string; zipCode: string }>
  ): Promise<Map<string, PropertyDetails | null>> {
    const results = new Map<string, PropertyDetails | null>();
    
    // Process in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(({ address, city, state, zipCode }) =>
        this.getPropertyDetails(address, city, state, zipCode)
      );
      
      const batchResults = await Promise.all(promises);
      batch.forEach(({ address, city, state, zipCode }, index) => {
        const key = this.createCacheKey(address, city, state, zipCode);
        results.set(key, batchResults[index]);
      });
    }
    
    return results;
  }

  /**
   * Fetch property data (mock implementation)
   */
  private async fetchPropertyData(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<PropertyDetails> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate realistic mock data
    const random = () => Math.random();
    const yearBuilt = 1980 + Math.floor(random() * 40);
    const currentYear = new Date().getFullYear();
    const roofAge = this.estimateRoofAge(yearBuilt);
    
    const propertyTypes = ["Single Family", "Townhouse", "Condo", "Multi-Family"];
    const roofTypes = ["Asphalt Shingle", "Architectural Shingle", "3-Tab Shingle", "Metal", "Tile"];
    const exteriors = ["Vinyl Siding", "Brick", "Stucco", "Wood", "Fiber Cement"];
    
    const squareFootage = 1500 + Math.floor(random() * 2500);
    const stories = random() > 0.6 ? 2 : 1;
    const roofType = roofTypes[Math.floor(random() * roofTypes.length)];

    const details: PropertyDetails = {
      address,
      city,
      state,
      zipCode,
      
      propertyType: propertyTypes[Math.floor(random() * propertyTypes.length)],
      yearBuilt,
      squareFootage,
      lotSize: 0.15 + random() * 0.5,
      stories,
      bedrooms: 2 + Math.floor(random() * 3),
      bathrooms: 1.5 + Math.floor(random() * 2),
      
      assessedValue: 200000 + Math.floor(random() * 400000),
      marketValue: 250000 + Math.floor(random() * 500000),
      lastSalePrice: 180000 + Math.floor(random() * 350000),
      lastSaleDate: new Date(2015 + Math.floor(random() * 10), Math.floor(random() * 12), 1),
      
      roofType,
      roofAge,
      roofArea: Math.ceil(squareFootage * 1.15 / 100),
      roofCondition: this.assessRoofCondition(roofAge, roofType, 0),
      
      exteriorWall: exteriors[Math.floor(random() * exteriors.length)],
      foundation: random() > 0.5 ? "Concrete Slab" : "Basement",
      
      ownerName: "Property Owner",
      ownerOccupied: random() > 0.2,
      
      source: "mock-data",
      lastUpdated: new Date(),
      confidence: 75 + Math.floor(random() * 20),
    };

    return details;
  }

  /**
   * Cache helpers
   */
  private createCacheKey(address: string, city: string, state: string, zipCode: string): string {
    return `${address.toLowerCase()}-${city.toLowerCase()}-${state.toLowerCase()}-${zipCode}`;
  }

  private getFromCache(key: string): PropertyDetails | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: PropertyDetails): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const propertyService = new PropertyDataService();
