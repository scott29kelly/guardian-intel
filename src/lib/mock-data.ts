// Mock data for Guardian Intel development
// This will be replaced with real API calls and database queries

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  yearBuilt: number;
  squareFootage: number;
  roofType: string;
  roofAge: number;
  propertyValue: number;
  insuranceCarrier: string;
  policyType: string;
  deductible: number;
  leadScore: number;
  urgencyScore: number;
  profitPotential: number;
  churnRisk: number;
  status: string;
  stage: string;
  assignedRep: string;
  lastContact: Date;
  nextAction: string;
  nextActionDate: Date;
}

export interface IntelItem {
  id: string;
  customerId: string;
  source: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  actionable: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
}

export interface WeatherEvent {
  id: string;
  customerId: string;
  eventType: string;
  eventDate: Date;
  severity: string;
  hailSize?: number;
  windSpeed?: number;
  damageReported: boolean;
  claimFiled: boolean;
}

export const mockCustomers: Customer[] = [
  {
    id: "1",
    firstName: "Michael",
    lastName: "Henderson",
    email: "m.henderson@email.com",
    phone: "(555) 234-5678",
    address: "4521 Oak Ridge Drive",
    city: "Columbus",
    state: "OH",
    zipCode: "43215",
    propertyType: "Single Family",
    yearBuilt: 1998,
    squareFootage: 2850,
    roofType: "Asphalt Shingle",
    roofAge: 18,
    propertyValue: 425000,
    insuranceCarrier: "State Farm",
    policyType: "HO-3",
    deductible: 2500,
    leadScore: 92,
    urgencyScore: 88,
    profitPotential: 18500,
    churnRisk: 12,
    status: "prospect",
    stage: "qualified",
    assignedRep: "Sarah Mitchell",
    lastContact: new Date("2026-01-05"),
    nextAction: "Schedule inspection",
    nextActionDate: new Date("2026-01-08"),
  },
  {
    id: "2",
    firstName: "Jennifer",
    lastName: "Walsh",
    email: "j.walsh@email.com",
    phone: "(555) 345-6789",
    address: "892 Maple Street",
    city: "Dublin",
    state: "OH",
    zipCode: "43017",
    propertyType: "Single Family",
    yearBuilt: 2005,
    squareFootage: 3200,
    roofType: "Architectural Shingle",
    roofAge: 12,
    propertyValue: 525000,
    insuranceCarrier: "Allstate",
    policyType: "HO-5",
    deductible: 1000,
    leadScore: 78,
    urgencyScore: 65,
    profitPotential: 22000,
    churnRisk: 25,
    status: "lead",
    stage: "contacted",
    assignedRep: "James Rodriguez",
    lastContact: new Date("2026-01-04"),
    nextAction: "Follow-up call",
    nextActionDate: new Date("2026-01-07"),
  },
  {
    id: "3",
    firstName: "Robert",
    lastName: "Chen",
    email: "r.chen@email.com",
    phone: "(555) 456-7890",
    address: "1245 Birch Lane",
    city: "Westerville",
    state: "OH",
    zipCode: "43081",
    propertyType: "Single Family",
    yearBuilt: 1992,
    squareFootage: 2400,
    roofType: "3-Tab Shingle",
    roofAge: 24,
    propertyValue: 375000,
    insuranceCarrier: "Progressive",
    policyType: "HO-3",
    deductible: 2000,
    leadScore: 95,
    urgencyScore: 94,
    profitPotential: 16500,
    churnRisk: 8,
    status: "prospect",
    stage: "proposal",
    assignedRep: "Sarah Mitchell",
    lastContact: new Date("2026-01-06"),
    nextAction: "Send proposal",
    nextActionDate: new Date("2026-01-07"),
  },
  {
    id: "4",
    firstName: "Amanda",
    lastName: "Foster",
    email: "a.foster@email.com",
    phone: "(555) 567-8901",
    address: "3678 Pine Valley Court",
    city: "Powell",
    state: "OH",
    zipCode: "43065",
    propertyType: "Single Family",
    yearBuilt: 2010,
    squareFootage: 4100,
    roofType: "Metal Standing Seam",
    roofAge: 8,
    propertyValue: 685000,
    insuranceCarrier: "USAA",
    policyType: "HO-5",
    deductible: 5000,
    leadScore: 45,
    urgencyScore: 30,
    profitPotential: 35000,
    churnRisk: 55,
    status: "lead",
    stage: "new",
    assignedRep: "James Rodriguez",
    lastContact: new Date("2026-01-03"),
    nextAction: "Initial outreach",
    nextActionDate: new Date("2026-01-09"),
  },
  {
    id: "5",
    firstName: "David",
    lastName: "Martinez",
    email: "d.martinez@email.com",
    phone: "(555) 678-9012",
    address: "567 Walnut Street",
    city: "Reynoldsburg",
    state: "OH",
    zipCode: "43068",
    propertyType: "Single Family",
    yearBuilt: 1985,
    squareFootage: 1950,
    roofType: "Asphalt Shingle",
    roofAge: 28,
    propertyValue: 285000,
    insuranceCarrier: "Nationwide",
    policyType: "HO-3",
    deductible: 1500,
    leadScore: 88,
    urgencyScore: 92,
    profitPotential: 14000,
    churnRisk: 15,
    status: "customer",
    stage: "closed",
    assignedRep: "Sarah Mitchell",
    lastContact: new Date("2026-01-06"),
    nextAction: "Start production",
    nextActionDate: new Date("2026-01-10"),
  },
];

export const mockIntelItems: IntelItem[] = [
  {
    id: "i1",
    customerId: "1",
    source: "weather-api",
    category: "weather",
    title: "Recent Hail Event Detected",
    content: "1.25 inch hail reported in area on Jan 2, 2026. High probability of roof damage based on shingle age and storm severity.",
    confidence: 94,
    actionable: true,
    priority: "critical",
    createdAt: new Date("2026-01-02"),
  },
  {
    id: "i2",
    customerId: "1",
    source: "property-api",
    category: "property",
    title: "Roof Age Exceeds Warranty",
    content: "18-year-old asphalt shingle roof. Most manufacturer warranties expire at 15-20 years. Prime candidate for replacement.",
    confidence: 100,
    actionable: true,
    priority: "high",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "i3",
    customerId: "1",
    source: "insurance-lookup",
    category: "insurance",
    title: "State Farm - Favorable Claim History",
    content: "Carrier known for smooth claims process. Customer has no prior claims in 5 years - good standing for new claim.",
    confidence: 87,
    actionable: true,
    priority: "medium",
    createdAt: new Date("2026-01-03"),
  },
  {
    id: "i4",
    customerId: "3",
    source: "weather-api",
    category: "weather",
    title: "Multiple Storm Events",
    content: "3 significant weather events in past 6 months. Wind gusts up to 65mph recorded. Recommend thorough inspection.",
    confidence: 91,
    actionable: true,
    priority: "critical",
    createdAt: new Date("2026-01-04"),
  },
  {
    id: "i5",
    customerId: "3",
    source: "property-api",
    category: "property",
    title: "Aging 3-Tab Shingles",
    content: "24-year-old 3-tab shingles significantly past expected lifespan. Visible granule loss likely. High conversion probability.",
    confidence: 95,
    actionable: true,
    priority: "high",
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "i6",
    customerId: "2",
    source: "web-search",
    category: "social",
    title: "Recent Home Purchase",
    content: "Property records show home purchased 8 months ago. New homeowners often invest in improvements and maintenance.",
    confidence: 100,
    actionable: false,
    priority: "medium",
    createdAt: new Date("2026-01-02"),
  },
  {
    id: "i7",
    customerId: "5",
    source: "crm-sync",
    category: "sales",
    title: "Contract Signed - Production Ready",
    content: "Customer signed contract for full roof replacement. Materials ordered. Awaiting crew scheduling.",
    confidence: 100,
    actionable: true,
    priority: "high",
    createdAt: new Date("2026-01-06"),
  },
];

export const mockWeatherEvents: WeatherEvent[] = [
  {
    id: "w1",
    customerId: "1",
    eventType: "hail",
    eventDate: new Date("2026-01-02"),
    severity: "severe",
    hailSize: 1.25,
    damageReported: false,
    claimFiled: false,
  },
  {
    id: "w2",
    customerId: "3",
    eventType: "wind",
    eventDate: new Date("2025-12-15"),
    severity: "moderate",
    windSpeed: 58,
    damageReported: false,
    claimFiled: false,
  },
  {
    id: "w3",
    customerId: "3",
    eventType: "hail",
    eventDate: new Date("2025-10-20"),
    severity: "moderate",
    hailSize: 0.75,
    damageReported: false,
    claimFiled: false,
  },
  {
    id: "w4",
    customerId: "5",
    eventType: "wind",
    eventDate: new Date("2025-11-08"),
    severity: "severe",
    windSpeed: 65,
    damageReported: true,
    claimFiled: true,
  },
];

export const mockDailyMetrics = {
  newLeads: 12,
  qualifiedLeads: 8,
  callsMade: 47,
  emailsSent: 23,
  visitsMade: 6,
  proposalsSent: 4,
  proposalValue: 87500,
  dealsClosed: 2,
  revenueWon: 34500,
  weatherAlerts: 3,
  stormLeads: 15,
};

export const mockTeamMetrics = [
  { name: "Sarah Mitchell", deals: 8, revenue: 142000, closeRate: 34, calls: 156 },
  { name: "James Rodriguez", deals: 6, revenue: 118000, closeRate: 28, calls: 142 },
  { name: "Emily Thompson", deals: 5, revenue: 95000, closeRate: 25, calls: 128 },
  { name: "Marcus Johnson", deals: 4, revenue: 78000, closeRate: 22, calls: 115 },
];

export const mockPipelineData = [
  { stage: "New Leads", count: 45, value: 675000 },
  { stage: "Contacted", count: 32, value: 512000 },
  { stage: "Qualified", count: 24, value: 456000 },
  { stage: "Proposal", count: 18, value: 378000 },
  { stage: "Negotiation", count: 8, value: 184000 },
  { stage: "Closed Won", count: 12, value: 234000 },
];

export const mockWeeklyTrend = [
  { day: "Mon", leads: 8, calls: 42, deals: 1 },
  { day: "Tue", leads: 12, calls: 56, deals: 2 },
  { day: "Wed", leads: 10, calls: 48, deals: 1 },
  { day: "Thu", leads: 15, calls: 62, deals: 3 },
  { day: "Fri", leads: 11, calls: 51, deals: 2 },
  { day: "Sat", leads: 6, calls: 24, deals: 0 },
  { day: "Sun", leads: 3, calls: 12, deals: 0 },
];
