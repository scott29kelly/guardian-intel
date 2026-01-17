import { County, StateCode, DataSource, Competitor } from './types';

// Guardian's 6-state territory
export const GUARDIAN_STATES: StateCode[] = ['PA', 'NY', 'VA', 'NJ', 'DE', 'MD'];

export const GUARDIAN_OFFICES = {
  southampton_pa: {
    name: 'Main Headquarters',
    address: '610 Lakeside Drive, Southampton, PA 18966',
    phone: '1-855-424-5911',
    coordinates: { lat: 40.1876, lng: -75.0041 },
    primaryTerritory: ['PA', 'NJ', 'DE'] as StateCode[],
  },
  pittsford_ny: {
    name: 'NY Office',
    address: '1160 Pittsford Victor Road, Pittsford, New York 14534',
    phone: '1-855-766-3911',
    coordinates: { lat: 43.0937, lng: -77.5150 },
    primaryTerritory: ['NY'] as StateCode[],
  },
  fredericksburg_va: {
    name: 'VA Headquarters',
    address: '1320 Central Park Blvd, Suite 200, Fredericksburg, VA 22401',
    phone: '1-540-425-6770',
    coordinates: { lat: 38.3032, lng: -77.4605 },
    primaryTerritory: ['VA', 'MD'] as StateCode[],
  },
};

// Representative counties in Guardian territory
export const TERRITORY_COUNTIES: County[] = [
  // Pennsylvania - Primary Market
  { name: 'Bucks', state: 'PA', fipsCode: '42017', population: 628341, medianHomeValue: 385000, medianHomeAge: 42, coordinates: { lat: 40.3388, lng: -75.1052 } },
  { name: 'Montgomery', state: 'PA', fipsCode: '42091', population: 856553, medianHomeValue: 425000, medianHomeAge: 48, coordinates: { lat: 40.2100, lng: -75.3700 } },
  { name: 'Lehigh', state: 'PA', fipsCode: '42077', population: 374557, medianHomeValue: 275000, medianHomeAge: 45, coordinates: { lat: 40.6134, lng: -75.5930 } },
  { name: 'Northampton', state: 'PA', fipsCode: '42095', population: 312951, medianHomeValue: 265000, medianHomeAge: 47, coordinates: { lat: 40.7534, lng: -75.3071 } },
  { name: 'Chester', state: 'PA', fipsCode: '42029', population: 534413, medianHomeValue: 445000, medianHomeAge: 38, coordinates: { lat: 39.9700, lng: -75.7500 } },
  { name: 'Delaware', state: 'PA', fipsCode: '42045', population: 576830, medianHomeValue: 285000, medianHomeAge: 55, coordinates: { lat: 39.9167, lng: -75.4000 } },
  
  // New Jersey
  { name: 'Burlington', state: 'NJ', fipsCode: '34005', population: 461860, medianHomeValue: 315000, medianHomeAge: 40, coordinates: { lat: 39.8767, lng: -74.6683 } },
  { name: 'Camden', state: 'NJ', fipsCode: '34007', population: 523485, medianHomeValue: 235000, medianHomeAge: 50, coordinates: { lat: 39.8000, lng: -74.9500 } },
  { name: 'Mercer', state: 'NJ', fipsCode: '34021', population: 387340, medianHomeValue: 345000, medianHomeAge: 48, coordinates: { lat: 40.2833, lng: -74.7000 } },
  
  // New York
  { name: 'Monroe', state: 'NY', fipsCode: '36055', population: 759443, medianHomeValue: 185000, medianHomeAge: 55, coordinates: { lat: 43.1500, lng: -77.6167 } },
  { name: 'Ontario', state: 'NY', fipsCode: '36069', population: 112458, medianHomeValue: 195000, medianHomeAge: 48, coordinates: { lat: 42.8500, lng: -77.3000 } },
  
  // Virginia
  { name: 'Spotsylvania', state: 'VA', fipsCode: '51177', population: 140045, medianHomeValue: 365000, medianHomeAge: 25, coordinates: { lat: 38.1833, lng: -77.6500 } },
  { name: 'Stafford', state: 'VA', fipsCode: '51179', population: 156927, medianHomeValue: 425000, medianHomeAge: 22, coordinates: { lat: 38.4167, lng: -77.4500 } },
  { name: 'Prince William', state: 'VA', fipsCode: '51153', population: 482204, medianHomeValue: 445000, medianHomeAge: 28, coordinates: { lat: 38.7000, lng: -77.4833 } },
  
  // Maryland
  { name: 'Frederick', state: 'MD', fipsCode: '24021', population: 271717, medianHomeValue: 395000, medianHomeAge: 32, coordinates: { lat: 39.4667, lng: -77.4000 } },
  { name: 'Montgomery', state: 'MD', fipsCode: '24031', population: 1062061, medianHomeValue: 545000, medianHomeAge: 42, coordinates: { lat: 39.1333, lng: -77.2000 } },
  
  // Delaware
  { name: 'New Castle', state: 'DE', fipsCode: '10003', population: 570719, medianHomeValue: 285000, medianHomeAge: 45, coordinates: { lat: 39.5833, lng: -75.6333 } },
];

// Data source definitions - CRITICAL for showing execs what's mock vs real
export const DATA_SOURCES: DataSource[] = [
  {
    id: 'noaa_storm_events',
    name: 'NOAA Storm Events Database',
    type: 'weather',
    status: 'mock', // Would be 'live' in production
    description: 'Historical severe weather reports including hail, wind, and tornado events.',
    refreshFrequency: 'daily',
    lastUpdated: new Date(),
    reliability: 95,
    recordCount: 1247,
    integrationNotes: 'Free public API available at api.weather.gov. Production integration: ~2 weeks.',
    iconName: 'CloudLightning',
  },
  {
    id: 'county_permits',
    name: 'County Building Permits',
    type: 'permits',
    status: 'mock',
    description: 'Building permit applications from county governments.',
    refreshFrequency: 'weekly',
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    reliability: 75,
    recordCount: 3892,
    integrationNotes: 'Requires individual county API integrations. Some counties have open data portals.',
    iconName: 'FileCheck',
  },
  {
    id: 'zillow_market',
    name: 'Zillow Market Data',
    type: 'market',
    status: 'placeholder', // Shows this needs subscription
    description: 'Housing market indicators: values, sales velocity, trends.',
    refreshFrequency: 'monthly',
    lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    reliability: 88,
    recordCount: 0,
    integrationNotes: 'Requires Zillow API partnership ($). Alternative: Redfin Data Center (free).',
    iconName: 'Home',
  },
  {
    id: 'roofing_contractor_mag',
    name: 'Roofing Contractor Magazine',
    type: 'trade_journal',
    status: 'placeholder',
    description: 'Industry news, trends, and best practices.',
    refreshFrequency: 'weekly',
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reliability: 85,
    recordCount: 0,
    integrationNotes: 'Requires RSS integration or content partnership. Subscription needed for full access.',
    iconName: 'Newspaper',
  },
  {
    id: 'google_alerts',
    name: 'Competitor Monitoring',
    type: 'competitive',
    status: 'mock',
    description: 'Automated competitor mentions and market activity.',
    refreshFrequency: 'daily',
    lastUpdated: new Date(),
    reliability: 65,
    recordCount: 147,
    integrationNotes: 'Free via Google Alerts RSS. Production: aggregate alerts for key competitors.',
    iconName: 'Search',
  },
  {
    id: 'insurance_reports',
    name: 'Insurance Industry Reports',
    type: 'insurance',
    status: 'placeholder',
    description: 'Claim trends, carrier policies, adjuster patterns.',
    refreshFrequency: 'monthly',
    lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    reliability: 80,
    recordCount: 0,
    integrationNotes: 'Requires industry subscriptions (IBHS, III) or public adjuster network partnership.',
    iconName: 'Shield',
  },
];

// Mock competitors for demo
export const MOCK_COMPETITORS: Competitor[] = [
  {
    id: 'comp_1',
    name: 'Statewide Roofing Solutions',
    serviceArea: ['PA', 'NJ'] as StateCode[],
    estimatedSize: 'medium',
    strengths: ['Strong Google reviews', 'Fast response time'],
    weaknesses: ['Limited insurance expertise'],
    threatLevel: 'high',
  },
  {
    id: 'comp_2',
    name: 'Northeast Storm Repair',
    serviceArea: ['PA', 'NY', 'NJ'] as StateCode[],
    estimatedSize: 'large',
    strengths: ['Multi-state coverage', 'Marketing budget'],
    weaknesses: ['Impersonal service'],
    threatLevel: 'high',
  },
  {
    id: 'comp_3',
    name: 'Heritage Home Exteriors',
    serviceArea: ['PA'] as StateCode[],
    estimatedSize: 'small',
    strengths: ['Local reputation', 'Quality workmanship'],
    weaknesses: ['Limited capacity'],
    threatLevel: 'moderate',
  },
  {
    id: 'comp_4',
    name: 'VA Storm Masters',
    serviceArea: ['VA', 'MD'] as StateCode[],
    estimatedSize: 'medium',
    strengths: ['Regional expertise', 'Established network'],
    weaknesses: ['Higher pricing'],
    threatLevel: 'moderate',
  },
  {
    id: 'comp_5',
    name: 'Rochester Roofing Co',
    serviceArea: ['NY'] as StateCode[],
    estimatedSize: 'medium',
    strengths: ['Long history', 'Commercial focus'],
    weaknesses: ['Slower response'],
    threatLevel: 'low',
  },
];

// Municipality data for permits
export const MUNICIPALITIES: Record<StateCode, string[]> = {
  PA: ['Warminster', 'Doylestown', 'Newtown', 'Allentown', 'Bethlehem', 'Easton', 'West Chester', 'Media', 'Lansdale', 'Norristown'],
  NJ: ['Mount Laurel', 'Cherry Hill', 'Moorestown', 'Princeton', 'Trenton', 'Hamilton', 'Haddonfield'],
  NY: ['Rochester', 'Pittsford', 'Victor', 'Canandaigua', 'Fairport', 'Brighton', 'Henrietta'],
  VA: ['Fredericksburg', 'Spotsylvania', 'Stafford', 'Woodbridge', 'Manassas', 'Dale City'],
  MD: ['Frederick', 'Bethesda', 'Rockville', 'Silver Spring', 'Gaithersburg', 'Germantown'],
  DE: ['Wilmington', 'Newark', 'New Castle', 'Bear', 'Hockessin', 'Middletown'],
};

// Storm event type display names
export const STORM_TYPE_LABELS: Record<string, string> = {
  hail: 'Hail Storm',
  wind: 'High Wind Event',
  tornado: 'Tornado',
  severe_thunderstorm: 'Severe Thunderstorm',
  tropical_storm: 'Tropical Storm',
  flooding: 'Flooding',
  winter_storm: 'Winter Storm',
};

// Severity level display config
export const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  minor: { label: 'Minor', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
  moderate: { label: 'Moderate', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  significant: { label: 'Significant', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  severe: { label: 'Severe', color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  extreme: { label: 'Extreme', color: 'text-red-500', bgColor: 'bg-red-500/20' },
};
