/**
 * Full Demo Data Seed Script
 * 
 * Generates 6 months of realistic time-series data:
 * - 250 customers across PA/NJ/DE
 * - 150 weather events with seasonal patterns
 * - 400 intel items
 * - 800 interactions
 * 
 * Run with: npx tsx prisma/seed-full.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// Configuration
// ============================================================

const CUSTOMER_COUNT = 250;
const WEATHER_EVENT_COUNT = 150;
const INTEL_ITEMS_COUNT = 400;
const INTERACTIONS_COUNT = 800;

// Date range: 6 months back from today
const END_DATE = new Date();
const START_DATE = new Date();
START_DATE.setMonth(START_DATE.getMonth() - 6);

// ============================================================
// Geographic Data (PA/NJ/DE region)
// ============================================================

const LOCATIONS = [
  // Bucks County, PA
  { city: "Bensalem", state: "PA", county: "Bucks", zip: "19020", lat: 40.1043, lng: -74.9518 },
  { city: "Bristol", state: "PA", county: "Bucks", zip: "19007", lat: 40.0995, lng: -74.8516 },
  { city: "Langhorne", state: "PA", county: "Bucks", zip: "19047", lat: 40.1746, lng: -74.9224 },
  { city: "Newtown", state: "PA", county: "Bucks", zip: "18940", lat: 40.2290, lng: -74.9368 },
  { city: "Doylestown", state: "PA", county: "Bucks", zip: "18901", lat: 40.3101, lng: -75.1299 },
  { city: "Warminster", state: "PA", county: "Bucks", zip: "18974", lat: 40.2037, lng: -75.0874 },
  { city: "Southampton", state: "PA", county: "Bucks", zip: "18966", lat: 40.1762, lng: -75.0035 },
  { city: "Levittown", state: "PA", county: "Bucks", zip: "19055", lat: 40.1551, lng: -74.8288 },
  { city: "Yardley", state: "PA", county: "Bucks", zip: "19067", lat: 40.2457, lng: -74.8460 },
  { city: "Quakertown", state: "PA", county: "Bucks", zip: "18951", lat: 40.4418, lng: -75.3416 },
  
  // Montgomery County, PA
  { city: "Norristown", state: "PA", county: "Montgomery", zip: "19401", lat: 40.1212, lng: -75.3399 },
  { city: "King of Prussia", state: "PA", county: "Montgomery", zip: "19406", lat: 40.0887, lng: -75.3963 },
  { city: "Lansdale", state: "PA", county: "Montgomery", zip: "19446", lat: 40.2415, lng: -75.2838 },
  { city: "Willow Grove", state: "PA", county: "Montgomery", zip: "19090", lat: 40.1440, lng: -75.1157 },
  { city: "Horsham", state: "PA", county: "Montgomery", zip: "19044", lat: 40.1779, lng: -75.1277 },
  { city: "Blue Bell", state: "PA", county: "Montgomery", zip: "19422", lat: 40.1526, lng: -75.2666 },
  { city: "Hatboro", state: "PA", county: "Montgomery", zip: "19040", lat: 40.1762, lng: -75.1024 },
  { city: "Abington", state: "PA", county: "Montgomery", zip: "19001", lat: 40.1140, lng: -75.1174 },
  
  // Delaware County, PA
  { city: "Media", state: "PA", county: "Delaware", zip: "19063", lat: 39.9168, lng: -75.3877 },
  { city: "Springfield", state: "PA", county: "Delaware", zip: "19064", lat: 39.9301, lng: -75.3205 },
  { city: "Drexel Hill", state: "PA", county: "Delaware", zip: "19026", lat: 39.9468, lng: -75.2924 },
  { city: "Havertown", state: "PA", county: "Delaware", zip: "19083", lat: 39.9801, lng: -75.3099 },
  { city: "Broomall", state: "PA", county: "Delaware", zip: "19008", lat: 39.9676, lng: -75.3560 },
  
  // Philadelphia County, PA
  { city: "Philadelphia", state: "PA", county: "Philadelphia", zip: "19103", lat: 39.9526, lng: -75.1652 },
  { city: "Philadelphia", state: "PA", county: "Philadelphia", zip: "19111", lat: 40.0579, lng: -75.0774 },
  { city: "Philadelphia", state: "PA", county: "Philadelphia", zip: "19124", lat: 40.0218, lng: -75.0935 },
  { city: "Philadelphia", state: "PA", county: "Philadelphia", zip: "19149", lat: 40.0379, lng: -75.0624 },
  
  // Burlington County, NJ
  { city: "Mount Laurel", state: "NJ", county: "Burlington", zip: "08054", lat: 39.9340, lng: -74.8916 },
  { city: "Moorestown", state: "NJ", county: "Burlington", zip: "08057", lat: 39.9687, lng: -74.9488 },
  { city: "Burlington", state: "NJ", county: "Burlington", zip: "08016", lat: 40.0712, lng: -74.8649 },
  { city: "Marlton", state: "NJ", county: "Burlington", zip: "08053", lat: 39.8912, lng: -74.9216 },
  { city: "Cinnaminson", state: "NJ", county: "Burlington", zip: "08077", lat: 39.9965, lng: -74.9927 },
  
  // Camden County, NJ
  { city: "Cherry Hill", state: "NJ", county: "Camden", zip: "08002", lat: 39.9346, lng: -75.0307 },
  { city: "Voorhees", state: "NJ", county: "Camden", zip: "08043", lat: 39.8451, lng: -74.9527 },
  { city: "Haddonfield", state: "NJ", county: "Camden", zip: "08033", lat: 39.8915, lng: -75.0377 },
  { city: "Collingswood", state: "NJ", county: "Camden", zip: "08108", lat: 39.9165, lng: -75.0710 },
  
  // Mercer County, NJ
  { city: "Princeton", state: "NJ", county: "Mercer", zip: "08540", lat: 40.3573, lng: -74.6672 },
  { city: "Trenton", state: "NJ", county: "Mercer", zip: "08608", lat: 40.2171, lng: -74.7429 },
  { city: "Hamilton", state: "NJ", county: "Mercer", zip: "08610", lat: 40.2115, lng: -74.6735 },
  { city: "Ewing", state: "NJ", county: "Mercer", zip: "08618", lat: 40.2676, lng: -74.7999 },
  
  // New Castle County, DE
  { city: "Wilmington", state: "DE", county: "New Castle", zip: "19801", lat: 39.7391, lng: -75.5398 },
  { city: "Newark", state: "DE", county: "New Castle", zip: "19711", lat: 39.6837, lng: -75.7497 },
  { city: "Bear", state: "DE", county: "New Castle", zip: "19701", lat: 39.6290, lng: -75.6549 },
  { city: "Middletown", state: "DE", county: "New Castle", zip: "19709", lat: 39.4496, lng: -75.7163 },
  { city: "New Castle", state: "DE", county: "New Castle", zip: "19720", lat: 39.6620, lng: -75.5666 },
  
  // Kent County, DE
  { city: "Dover", state: "DE", county: "Kent", zip: "19901", lat: 39.1582, lng: -75.5244 },
  { city: "Smyrna", state: "DE", county: "Kent", zip: "19977", lat: 39.2998, lng: -75.6046 },
];

const STREET_NAMES = [
  "Maple", "Oak", "Cedar", "Pine", "Elm", "Walnut", "Cherry", "Birch", "Willow", "Spruce",
  "Main", "Park", "Washington", "Lincoln", "Jefferson", "Franklin", "Adams", "Madison",
  "Ridge", "Valley", "Hill", "Creek", "Meadow", "Forest", "Lake", "River", "Spring", "Brook"
];

const STREET_TYPES = ["Street", "Avenue", "Drive", "Lane", "Road", "Court", "Way", "Circle", "Boulevard"];

const FIRST_NAMES = [
  "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Christopher",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth",
  "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Dorothy", "Kimberly", "Emily", "Donna",
  "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary",
  "Michelle", "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Laura", "Sharon", "Cynthia"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "Chen", "Patel", "Kim", "Murphy", "Sullivan", "O'Brien", "Kelly", "Cohen", "Schwartz", "Romano"
];

const ROOF_TYPES = [
  "3-Tab Shingle", "Architectural Shingle", "Asphalt Shingle", "Metal Standing Seam",
  "Slate", "Tile", "Cedar Shake", "Composite", "TPO", "EPDM"
];

const PROPERTY_TYPES = ["single_family", "townhouse", "condo", "multi_family"];

const INSURANCE_CARRIERS = [
  "State Farm", "Allstate", "GEICO", "Liberty Mutual", "Nationwide", "Farmers",
  "USAA", "Progressive", "Travelers", "American Family", "Erie Insurance"
];

const LEAD_SOURCES = [
  "storm_canvass", "referral", "website", "google_ads", "facebook", "homeshow",
  "door_knock", "mailer", "repeat_customer", "insurance_referral", "realtor"
];

const WEATHER_TYPES = ["hail", "wind", "tornado", "thunderstorm", "flood"];

const INTEL_CATEGORIES = [
  "storm_damage", "roof_age", "insurance_claim", "competitor_activity",
  "property_sale", "permit_filed", "neighborhood_trend", "seasonal_opportunity"
];

// ============================================================
// Helper Functions
// ============================================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}

function generatePhone(): string {
  const area = randomElement(["215", "267", "610", "484", "856", "609", "302"]);
  return `(${area}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "aol.com", "icloud.com", "comcast.net"];
  const r = Math.random();
  if (r < 0.5) {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomElement(domains)}`;
  } else if (r < 0.8) {
    return `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${randomInt(1, 99)}@${randomElement(domains)}`;
  } else {
    return `${firstName.toLowerCase()}${randomInt(100, 999)}@${randomElement(domains)}`;
  }
}

function generateAddress(): string {
  return `${randomInt(100, 9999)} ${randomElement(STREET_NAMES)} ${randomElement(STREET_TYPES)}`;
}

// Seasonal storm probability (higher in spring/summer)
function getSeasonalStormProbability(date: Date): number {
  const month = date.getMonth();
  const probabilities = [0.05, 0.08, 0.15, 0.25, 0.30, 0.25, 0.20, 0.18, 0.12, 0.08, 0.05, 0.04];
  return probabilities[month];
}

// Generate lead score based on various factors
function calculateLeadScore(roofAge: number, hasStormDamage: boolean, propertyValue: number): number {
  let score = 50;
  
  // Roof age factor (older = higher score)
  if (roofAge >= 25) score += 25;
  else if (roofAge >= 20) score += 20;
  else if (roofAge >= 15) score += 15;
  else if (roofAge >= 10) score += 10;
  
  // Storm damage factor
  if (hasStormDamage) score += 20;
  
  // Property value factor
  if (propertyValue >= 500000) score += 10;
  else if (propertyValue >= 400000) score += 7;
  else if (propertyValue >= 300000) score += 5;
  
  // Add some randomness
  score += randomInt(-10, 10);
  
  return Math.max(10, Math.min(100, score));
}

// ============================================================
// Main Seed Function
// ============================================================

async function main() {
  console.log("🌱 Starting full database seed...\n");
  console.log(`📊 Target: ${CUSTOMER_COUNT} customers, ${WEATHER_EVENT_COUNT} weather events`);
  console.log(`📊 Target: ${INTEL_ITEMS_COUNT} intel items, ${INTERACTIONS_COUNT} interactions\n`);

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await prisma.interaction.deleteMany();
  await prisma.intelItem.deleteMany();
  await prisma.weatherEvent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.playbook.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Database cleared\n");

  // Create users
  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("GuardianDemo2026!", 12);
  
  const manager = await prisma.user.create({
    data: {
      email: "demo.manager@guardian.com",
      password: hashedPassword,
      name: "Sarah Mitchell",
      role: "manager",
      phone: "(215) 555-0100",
      totalDeals: 156,
      totalRevenue: 2340000,
      avgDealSize: 15000,
      closeRate: 0.42,
      monthlyTarget: 150000,
    },
  });

  const reps = await Promise.all([
    prisma.user.create({
      data: {
        email: "demo.rep@guardian.com",
        password: hashedPassword,
        name: "Mike Johnson",
        role: "rep",
        phone: "(215) 555-0101",
        managerId: manager.id,
        totalDeals: 45,
        totalRevenue: 675000,
        avgDealSize: 15000,
        closeRate: 0.38,
        monthlyTarget: 75000,
      },
    }),
    prisma.user.create({
      data: {
        email: "rep2@guardian.com",
        password: hashedPassword,
        name: "Jennifer Davis",
        role: "rep",
        phone: "(215) 555-0102",
        managerId: manager.id,
        totalDeals: 52,
        totalRevenue: 780000,
        avgDealSize: 15000,
        closeRate: 0.45,
        monthlyTarget: 75000,
      },
    }),
    prisma.user.create({
      data: {
        email: "rep3@guardian.com",
        password: hashedPassword,
        name: "David Wilson",
        role: "rep",
        phone: "(215) 555-0103",
        managerId: manager.id,
        totalDeals: 38,
        totalRevenue: 570000,
        avgDealSize: 15000,
        closeRate: 0.35,
        monthlyTarget: 75000,
      },
    }),
  ]);

  const allReps = [manager, ...reps];
  console.log(`   ✓ Created ${allReps.length} users\n`);

  // Create customers
  console.log("🏠 Creating customers...");
  const customers: any[] = [];
  const statuses = ["lead", "prospect", "qualified", "customer", "closed-won", "closed-lost"];
  const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "closed"];

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const location = randomElement(LOCATIONS);
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const roofAge = randomInt(3, 35);
    const propertyValue = randomInt(200000, 800000);
    const hasStormHistory = randomBoolean(0.3);
    
    const status = randomElement(statuses);
    const stage = randomElement(stages);
    const createdAt = randomDate(START_DATE, END_DATE);
    
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: generateEmail(firstName, lastName),
        phone: generatePhone(),
        altPhone: randomBoolean(0.3) ? generatePhone() : null,
        address: generateAddress(),
        city: location.city,
        state: location.state,
        zipCode: location.zip,
        county: location.county,
        latitude: location.lat + randomFloat(-0.02, 0.02),
        longitude: location.lng + randomFloat(-0.02, 0.02),
        propertyType: randomElement(PROPERTY_TYPES),
        yearBuilt: randomInt(1950, 2020),
        squareFootage: randomInt(1200, 4500),
        lotSize: randomFloat(0.1, 2.0),
        stories: randomElement([1, 1, 2, 2, 2, 3]),
        bedrooms: randomInt(2, 6),
        bathrooms: randomFloat(1, 4, 1),
        roofType: randomElement(ROOF_TYPES),
        roofAge,
        roofSquares: randomInt(15, 45),
        roofPitch: randomElement(["4/12", "5/12", "6/12", "7/12", "8/12", "9/12", "10/12"]),
        roofCondition: roofAge > 20 ? "poor" : roofAge > 12 ? "fair" : "good",
        propertyValue,
        estimatedJobValue: randomInt(8000, 35000),
        insuranceCarrier: randomElement(INSURANCE_CARRIERS),
        policyNumber: `POL-${randomInt(100000, 999999)}`,
        policyType: randomElement(["HO-3", "HO-5", "HO-6"]),
        deductible: randomElement([500, 1000, 1500, 2000, 2500]),
        claimHistory: randomInt(0, 3),
        leadScore: calculateLeadScore(roofAge, hasStormHistory, propertyValue),
        urgencyScore: randomInt(20, 80),
        profitPotential: randomInt(5000, 25000),
        churnRisk: randomInt(5, 50),
        engagementScore: randomInt(30, 95),
        status,
        stage,
        leadSource: randomElement(LEAD_SOURCES),
        assignedRep: { connect: { id: randomElement(allReps).id } },
        createdAt,
      },
    });
    
    customers.push(customer);
    
    if ((i + 1) % 50 === 0) {
      console.log(`   ✓ Created ${i + 1}/${CUSTOMER_COUNT} customers`);
    }
  }
  console.log(`   ✓ Created ${customers.length} customers\n`);

  // Create weather events
  console.log("⛈️  Creating weather events...");
  const weatherEvents: any[] = [];
  
  for (let i = 0; i < WEATHER_EVENT_COUNT; i++) {
    const eventDate = randomDate(START_DATE, END_DATE);
    const location = randomElement(LOCATIONS);
    const eventType = randomElement(WEATHER_TYPES);
    const severity = randomElement(["low", "moderate", "high", "severe"]);
    
    // Find customers in this area that might be affected
    const affectedCustomers = customers.filter(
      c => c.county === location.county && Math.random() < 0.3
    ).slice(0, randomInt(1, 5));
    
    for (const customer of affectedCustomers) {
      const weatherEvent = await prisma.weatherEvent.create({
        data: {
          customerId: customer.id,
          latitude: location.lat + randomFloat(-0.05, 0.05),
          longitude: location.lng + randomFloat(-0.05, 0.05),
          zipCode: location.zip,
          county: location.county,
          city: location.city,
          state: location.state,
          eventType,
          eventDate,
          severity,
          hailSize: eventType === "hail" ? randomFloat(0.5, 3.0) : null,
          hailDuration: eventType === "hail" ? randomInt(5, 45) : null,
          windSpeed: eventType === "wind" || eventType === "tornado" ? randomInt(40, 120) : null,
          windGust: eventType === "wind" || eventType === "tornado" ? randomInt(50, 150) : null,
          windDirection: randomElement(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
          damageReported: randomBoolean(0.4),
          claimFiled: randomBoolean(0.2),
          inspectionDone: randomBoolean(0.15),
          estimatedDamage: randomInt(2000, 25000),
          source: randomElement(["noaa", "nws", "spotter", "customer_report"]),
          affectedRadius: randomFloat(0.5, 5.0),
          affectedCustomers: randomInt(10, 200),
          createdAt: eventDate,
        },
      });
      weatherEvents.push(weatherEvent);
    }
    
    if ((i + 1) % 30 === 0) {
      console.log(`   ✓ Processed ${i + 1}/${WEATHER_EVENT_COUNT} storm events`);
    }
  }
  console.log(`   ✓ Created ${weatherEvents.length} weather event records\n`);

  // Create intel items
  console.log("🔍 Creating intel items...");
  let intelCount = 0;
  
  for (let i = 0; i < INTEL_ITEMS_COUNT; i++) {
    const customer = randomElement(customers);
    const category = randomElement(INTEL_CATEGORIES);
    const createdAt = randomDate(new Date(customer.createdAt), END_DATE);
    
    let title = "";
    let content = "";
    
    switch (category) {
      case "storm_damage":
        title = `Storm damage detected in ${customer.city}`;
        content = `Recent weather activity may have caused roof damage. Recommend inspection within 48 hours.`;
        break;
      case "roof_age":
        title = `Roof approaching end of life`;
        content = `Roof is ${customer.roofAge} years old. ${customer.roofType} typically lasts 20-25 years.`;
        break;
      case "insurance_claim":
        title = `Insurance claim opportunity`;
        content = `Recent storm damage may be covered under ${customer.insuranceCarrier} policy.`;
        break;
      case "competitor_activity":
        title = `Competitor seen in neighborhood`;
        content = `${randomElement(["ABC Roofing", "XYZ Contractors", "Local Roofers Inc"])} canvassing nearby.`;
        break;
      case "property_sale":
        title = `Property recently sold`;
        content = `New homeowners may need roof inspection. Great time to introduce services.`;
        break;
      case "permit_filed":
        title = `Roofing permit filed nearby`;
        content = `Neighbor at ${randomInt(100, 999)} ${randomElement(STREET_NAMES)} getting new roof.`;
        break;
      case "neighborhood_trend":
        title = `Multiple jobs in neighborhood`;
        content = `3+ roofing projects completed on this street in the past 6 months.`;
        break;
      case "seasonal_opportunity":
        title = `Pre-storm season outreach`;
        content = `Spring storm season approaching. Good time for preventive inspection.`;
        break;
    }
    
    await prisma.intelItem.create({
      data: {
        customerId: customer.id,
        source: randomElement(["weather_api", "property_records", "ai_analysis", "manual"]),
        category,
        title,
        content,
        confidence: randomFloat(0.6, 0.99),
        actionable: randomBoolean(0.7),
        priority: randomElement(["low", "medium", "high", "urgent"]),
        isRead: randomBoolean(0.4),
        isDismissed: randomBoolean(0.1),
        expiresAt: randomBoolean(0.5) ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        createdAt,
      },
    });
    
    intelCount++;
    if ((i + 1) % 100 === 0) {
      console.log(`   ✓ Created ${i + 1}/${INTEL_ITEMS_COUNT} intel items`);
    }
  }
  console.log(`   ✓ Created ${intelCount} intel items\n`);

  // Create interactions
  console.log("📞 Creating interactions...");
  let interactionCount = 0;
  
  for (let i = 0; i < INTERACTIONS_COUNT; i++) {
    const customer = randomElement(customers);
    const rep = randomElement(allReps);
    const type = randomElement(["call", "email", "appointment", "site_visit", "text", "voicemail"]);
    const direction = randomElement(["inbound", "outbound"]) as "inbound" | "outbound";
    const createdAt = randomDate(new Date(customer.createdAt), END_DATE);
    
    let subject = "";
    let content = "";
    let outcome = "";
    
    switch (type) {
      case "call":
        subject = direction === "outbound" ? "Outbound sales call" : "Customer inquiry";
        content = `Discussed roof condition and potential services. Customer ${randomElement(["interested", "needs time", "requested quote", "not interested"])}`;
        outcome = randomElement(["appointment_set", "callback_scheduled", "left_voicemail", "not_interested", "qualified"]);
        break;
      case "email":
        subject = randomElement(["Quote Request", "Follow-up", "Inspection Scheduling", "Thank You"]);
        content = `Email ${direction === "outbound" ? "sent" : "received"} regarding roofing services.`;
        outcome = randomElement(["replied", "no_response", "bounced", "opened"]);
        break;
      case "appointment":
        subject = "Roof inspection appointment";
        content = `Scheduled inspection at ${customer.address}. Estimated time: 45 minutes.`;
        outcome = randomElement(["completed", "rescheduled", "cancelled", "no_show"]);
        break;
      case "site_visit":
        subject = "On-site roof inspection";
        content = `Inspected roof. Found ${randomElement(["minor wear", "storm damage", "aging shingles", "good condition"])}. Took photos.`;
        outcome = randomElement(["quote_provided", "needs_follow_up", "closed_won", "closed_lost"]);
        break;
      case "text":
        subject = "SMS communication";
        content = `Text ${direction === "outbound" ? "sent" : "received"}: "${randomElement(["Thanks for your time today!", "When can you come out?", "Here's the quote link", "I'll think about it"])}"`;
        outcome = "delivered";
        break;
      case "voicemail":
        subject = "Voicemail left";
        content = "Left voicemail regarding roof inspection services.";
        outcome = randomElement(["callback_received", "no_callback"]);
        break;
    }
    
    await prisma.interaction.create({
      data: {
        customerId: customer.id,
        userId: rep.id,
        type,
        direction,
        subject,
        content,
        outcome,
        duration: type === "call" ? randomInt(30, 900) : type === "site_visit" ? randomInt(1800, 5400) : null,
        sentiment: randomElement(["positive", "neutral", "negative"]),
        nextAction: randomBoolean(0.4) ? randomElement(["follow_up_call", "send_quote", "schedule_inspection", "close_deal"]) : null,
        nextActionDate: randomBoolean(0.3) ? randomDate(createdAt, new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)) : null,
        createdAt,
      },
    });
    
    interactionCount++;
    if ((i + 1) % 200 === 0) {
      console.log(`   ✓ Created ${i + 1}/${INTERACTIONS_COUNT} interactions`);
    }
  }
  console.log(`   ✓ Created ${interactionCount} interactions\n`);

  // Create playbooks
  console.log("📚 Creating playbooks...");
  
  const playbooksData = [
    // STORM RESPONSE (2)
    {
      title: "Storm Damage Door Knock Script",
      description: "Full canvassing script for storm-affected neighborhoods with weather-specific hooks and urgency builders",
      category: "storm",
      type: "script",
      stage: "new",
      scenario: "storm canvassing",
      tags: ["door-knock", "canvassing", "storm", "hail", "wind"],
      content: `# Storm Damage Door Knock Script

## Pre-Knock Preparation
- Review weather data for the specific storm date and severity
- Note the exact hail size or wind speed for this area
- Have inspection form and business cards ready
- Wear company-branded shirt and ID badge

## The Approach
*Walk confidently up the driveway. Take a quick glance at the roof. Knock firmly 3 times.*

## Opening (First 10 Seconds)
> "Hi there! I'm [YOUR NAME] with Guardian Roofing & Siding. I'm not here to sell you anything today—I'm actually in the neighborhood because we've been helping your neighbors with damage from the [DATE] storm. Did you happen to notice if your roof took any hits?"

**If they say "No":**
> "That's what most people say at first! The thing is, hail damage is really hard to see from the ground. Would you mind if I took a quick 5-minute look? It's completely free, and I'll give you an honest assessment either way."

## Discovery Questions
1. "How old is your roof? Do you remember when it was last replaced?"
2. "Have you noticed any leaks or water stains inside?"
3. "Who's your insurance carrier? Some are easier to work with than others."
4. "Is this something you and [spouse's name] would decide on together?"

## Objection Handlers

### "I'm not interested"
> "Totally understand. Quick question though—if there WAS damage and your insurance would cover the whole thing, would you want to at least know about it? That's all I'm offering—free information."

### "I already had someone look"
> "Perfect! Who did you use? Did they file the claim for you, or did they just give you an estimate? We specialize in the insurance side—we've gotten homeowners an average of $8,000 more than their initial settlement."

## Pro Tips
- Mirror their energy. If they're rushed, be concise.
- Leave something behind. Even if they say no, leave a door hanger.
- Ask for referrals: "Before I go—do any of your neighbors have older roofs I should check on?"`,
    },
    {
      title: "Emergency Tarp & Repair Protocol",
      description: "Checklist for emergency roof situations including tarp installs and temporary repairs",
      category: "storm",
      type: "checklist",
      stage: "new",
      scenario: "emergency response",
      tags: ["emergency", "tarp", "storm", "leak", "urgent"],
      content: `# Emergency Tarp & Repair Protocol

## When to Offer Emergency Services
- Active leak reported during/after storm
- Missing shingles exposing decking
- Tree damage to roof structure
- Visible holes or punctures

## Pre-Arrival Checklist
- [ ] Confirm homeowner is on-site or has authorized access
- [ ] Verify storm date for insurance documentation
- [ ] Load truck with: tarps (multiple sizes), 2x4s, nails, rope, ladder
- [ ] Check weather—don't get on a wet roof
- [ ] Notify office of your ETA and expected completion time

## Arrival Protocol
1. **Document everything BEFORE starting work**
   - Take wide-angle photos of entire roof
   - Close-ups of all damage areas
   - Photos of interior damage
   - Video walkthrough if extensive

2. **Get signed authorization**

## Tarp Installation Steps
1. Measure the damaged area + 4 feet on all sides
2. Lay 2x4s along the top edge of tarp
3. Roll tarp over the 2x4, nail through tarp into decking
4. Stretch tarp tight over damaged area
5. Secure bottom edge with additional 2x4s and nails

## Emergency Repair Pricing
| Service | Homeowner Cost | Insurance Billable |
|---------|---------------|-------------------|
| Tarp (up to 10x12) | $250 | $350-500 |
| Tarp (up to 20x30) | $450 | $600-800 |`,
    },

    // OBJECTION HANDLING (3)
    {
      title: "Price Objection Playbook",
      description: "5+ proven rebuttals for 'too expensive' and price objections with psychological framing techniques",
      category: "objection-handling",
      type: "script",
      stage: "negotiation",
      scenario: "price objection",
      tags: ["objection", "price", "closing", "negotiation"],
      content: `# Price Objection Playbook

## Understanding the Objection
When someone says "it's too expensive," they're really saying one of three things:
1. "I don't have the money" (budget issue)
2. "I don't see the value" (perception issue)
3. "I'm not ready to decide" (timing/stall)

## The Magic Question
> "I appreciate you being upfront with me. Can I ask—when you say it's too expensive, do you mean compared to your budget, compared to another quote you received, or compared to what you expected?"

## Rebuttal #1: "Too Expensive Compared to Budget"
> "I totally understand—this is a significant investment. Let me ask you this: if your insurance approves the claim, your out-of-pocket is just your deductible, which is [AMOUNT]. Is that more manageable?"

## Rebuttal #2: "Too Expensive Compared to Another Quote"
> "I'm glad you're getting multiple quotes—that's smart. Can I see what they offered? I notice they're using [3-tab shingles / no starter strip / shorter warranty]. Here's what that means in 5 years..."

## Rebuttal #3: "Just Seems Expensive Overall"
> "I hear you. Let me put it in perspective: this roof protects a [VALUE] home. It's going to last 25-30 years. That's less than [$/month] over its lifetime."

## Never Say This
❌ "That's the best I can do"
❌ "You get what you pay for"

## Always Say This
✅ "Help me understand what's driving that concern"
✅ "What would make this feel like a good investment?"`,
    },
    {
      title: "Insurance Claim Hesitation Handler",
      description: "Handling homeowner fears about filing insurance claims and premium increases",
      category: "objection-handling",
      type: "script",
      stage: "qualified",
      scenario: "insurance fear",
      tags: ["objection", "insurance", "claim", "hesitation"],
      content: `# Insurance Claim Hesitation Handler

## Common Fears
1. "My premiums will go up"
2. "They'll drop me if I file a claim"
3. "I don't want to deal with my insurance company"
4. "I'd rather just pay out of pocket"

## Rebuttal #1: "My Premiums Will Go Up"
> "I totally understand that concern. Here's what most people don't know: for storm damage claims, your premium typically does NOT increase. Why? Because it's not your fault. Weather is an 'act of God'—insurance companies expect these claims."

## Rebuttal #2: "They'll Drop Me"
> "Insurance companies don't drop customers for one claim—especially not for storm damage. Actually, NOT filing can hurt you more. If you don't document this damage now and have a leak next year, they'll deny it as pre-existing."

## Rebuttal #3: "I Don't Want to Deal With Insurance"
> "I hear you—nobody enjoys that process. Here's the good news: you don't have to deal with them. That's literally what we do every day. I'll meet with the adjuster, handle the documentation, and manage any supplements."

## Rebuttal #4: "I'd Rather Just Pay Cash"
> "I respect that—it's your home and your choice. But if you could get a new roof for [DEDUCTIBLE] instead of [FULL PRICE], why wouldn't you? You've already paid for this coverage."`,
    },
    {
      title: '"I Need to Think About It" Response',
      description: "Creating urgency without pressure when prospects stall or delay decisions",
      category: "objection-handling",
      type: "script",
      stage: "proposal",
      scenario: "stall tactic",
      tags: ["objection", "stall", "think-about-it", "urgency"],
      content: `# "I Need to Think About It" Response

## What They're Really Saying
"I need to think about it" is rarely about thinking. It usually means:
- They're not convinced of the value
- They have an unspoken objection
- They want to shop around
- They need approval from someone else

## Step 1: Acknowledge and Isolate
> "I completely understand—this is a big decision. Before you think it over, can I ask: is there something specific that's giving you pause?"

## Step 2: Create Legitimate Urgency

**Storm-related deadline:**
> "Insurance companies typically accept claims from a storm for 6-12 months. We're already [X] months out from that storm."

**Material pricing:**
> "Shingle prices are going up [X]% next month due to supply chain issues. If we can get your order in by [DATE], I can lock in current pricing."

## Step 3: Offer a Low-Commitment Next Step
> "Why don't I schedule the adjuster meeting for [DATE]? You don't have to commit to anything—we're just getting the insurance company's opinion."

## Follow-Up Cadence
| Day | Action |
|-----|--------|
| Day 2 | Text: "Any questions come up?" |
| Day 5 | Call with time-sensitive reason |
| Day 10 | Email with value add |`,
    },

    // CLOSING (2)
    {
      title: "The Assumptive Close",
      description: "Script for confident deal closure using assumptive language and commitment questions",
      category: "closing",
      type: "script",
      stage: "proposal",
      scenario: "ready to close",
      tags: ["closing", "assumptive", "contract", "signature"],
      content: `# The Assumptive Close

## What Is an Assumptive Close?
An assumptive close skips the "do you want to move forward?" question and assumes the answer is yes. You move straight into logistics.

## Assumptive Language Patterns

**Instead of:** "Would you like to move forward?"
**Say:** "Let's get you on the schedule. What works better for you—mornings or afternoons?"

**Instead of:** "Are you ready to sign?"
**Say:** "I just need your signature here and we'll get the materials ordered."

## The Transition
> "Okay, [NAME], here's where we're at: your insurance approved the claim at [AMOUNT], your deductible is [AMOUNT]. I've got availability starting [DATE]. Let me grab the paperwork and we'll get you locked in."

## If They Hesitate
- **"We need to discuss this privately."** → "Of course. I'll step outside for a few minutes."
- **"That's a lot of money."** → "Remember, after your deductible, the rest is covered by insurance."

## The Paperwork Moment
> "I just need your signature right here—this authorizes us to order materials and get you on the schedule."

## After They Sign
> "You made a great decision. I'll submit the materials order today, our operations team will call you to confirm the installation date. Any questions before I head out?"`,
    },
    {
      title: "Insurance Claim Close",
      description: "Walking customers through the signing process when an insurance claim is involved",
      category: "closing",
      type: "script",
      stage: "proposal",
      scenario: "insurance job",
      tags: ["closing", "insurance", "deductible", "aob"],
      content: `# Insurance Claim Close

## The Financial Explanation
> "Let me walk you through how the money works—it's simpler than most people think.

> "Your insurance approved the claim at [TOTAL AMOUNT]. They'll send you a check for [AMOUNT MINUS DEPRECIATION]—that's the ACV. Once we complete the work, they release the remaining depreciation holdback.

> "Your only out-of-pocket is your deductible: [DEDUCTIBLE AMOUNT]."

## Collecting the Deductible
> "For the deductible, we accept check, credit card, or financing if you'd prefer to spread it out. What works best for you?"

## The Assignment of Benefits (AOB)
> "This form is called the Assignment of Benefits. It authorizes us to deal directly with your insurance company on your behalf. I handle all the paperwork, supplements, and any back-and-forth—so you don't have to."

## The Final Close
> "I've got a crew available starting [DATE]. All I need is your signature here, here, and the deductible, and we'll get your materials ordered today."

## After They Sign
> "Here's what happens next:
> 1. I'll order materials today.
> 2. Our project manager will call you 2 days before installation.
> 3. On install day, the crew arrives around 7-8 AM.
> 4. I'll handle the insurance depreciation release."`,
    },

    // DISCOVERY (2)
    {
      title: "Initial Consultation Framework",
      description: "First meeting structure for understanding homeowner needs and building rapport",
      category: "discovery",
      type: "guide",
      stage: "new",
      scenario: "first visit",
      tags: ["discovery", "consultation", "rapport", "first-meeting"],
      content: `# Initial Consultation Framework

## Purpose of the First Meeting
The initial consultation is NOT about selling—it's about:
1. Building rapport and trust
2. Understanding their specific situation
3. Identifying pain points and motivations
4. Positioning yourself as a trusted advisor

## The Arrival
- Park on the street, not in their driveway
- Take a quick look at the roof from your car
- Ring the doorbell; stand back 4-5 feet

> "Hi, I'm [NAME] with Guardian Roofing. Thanks for making time for me today. Before we get started—how's your day going?"

## The Discovery Phase

### Open-Ended Questions
1. "What prompted you to reach out about your roof?"
2. "Have you noticed any specific issues—leaks, missing shingles?"
3. "How old is your current roof, if you know?"
4. "Have you been affected by any of the recent storms?"

### Motivation Questions
5. "What's driving the timing on this?"
6. "Have you gotten any other quotes?"
7. "If we did find damage, how would you handle it—insurance, out of pocket, financing?"
8. "Is this something you and [SPOUSE] would decide together?"

## Transitioning to the Inspection
> "Based on what you've told me, I'd like to get up on the roof and take a closer look. I'll document everything with photos, and then we can sit down and I'll show you exactly what I find."`,
    },
    {
      title: "Roof Age & History Discovery",
      description: "Questions and techniques to uncover roof replacement triggers and timeline",
      category: "discovery",
      type: "script",
      stage: "new",
      scenario: "roof assessment",
      tags: ["discovery", "roof-age", "history", "inspection"],
      content: `# Roof Age & History Discovery

## Opening Questions

### If They Know the Roof Age
> "Great, so it's about [X] years old. Do you remember if it came with the house or if you had it replaced?"

### If They Don't Know
> "No worries—most homeowners don't know off the top of their head. When did you buy the house? Was the roof new then?"

## History Questions

### Previous Work
> "Has any work been done on the roof since you've lived here? Repairs, patches?"

### Leak History
> "Have you ever had any leaks or water stains on your ceilings?"

### Storm History
> "Do you remember if your roof was affected by any major storms—specifically hail or high winds?"

## Key Data Points to Capture
| Question | Answer |
|----------|--------|
| Approximate roof age | |
| Original install or replacement? | |
| Shingle type (if known) | |
| Previous repairs/patches | |
| Leak history | |
| Storm damage history | |
| Insurance claims filed? | |

## Transitioning to the Inspection
> "Based on what you've told me, I definitely want to take a closer look. A [X]-year-old roof with [HISTORY NOTES] is something we should document carefully."`,
    },

    // COLD CALLING (1)
    {
      title: "Cold Call Introduction Script",
      description: "Opening, qualifying, and appointment setting for cold outbound calls",
      category: "cold-call",
      type: "script",
      stage: "new",
      scenario: "cold outreach",
      tags: ["cold-call", "phone", "outbound", "appointment-setting"],
      content: `# Cold Call Introduction Script

## The Opening (First 10 Seconds)
> "Hi, is this [HOMEOWNER NAME]?

> "Hey [NAME], this is [YOUR NAME] with Guardian Roofing & Siding. I'm calling because we've been working in [THEIR NEIGHBORHOOD] this week. Do you have 30 seconds?"

## The Hook

**Weather-Based Hook:**
> "We've been checking homes in [CITY] after the [DATE] storm. There was [hail/wind] reported in your area, and a lot of homeowners don't realize they might have damage that's covered by insurance."

**Age-Based Hook:**
> "We've been helping homeowners with roofs getting close to end of life. I saw your home was built in [YEAR], which means your roof could be [AGE]."

## Qualifying Questions
1. "How old is your roof, if you know?"
2. "Have you noticed any leaks or missing shingles?"
3. "Who's your homeowner's insurance through?"

## Setting the Appointment
> "I can swing by for a free 15-minute inspection. I'll take photos of any damage and give you a straight answer—no obligation. Does [DAY] in the [MORNING/AFTERNOON] work?"

## Handling Objections

### "I'm not interested."
> "Quick question: if your roof DID have storm damage and your insurance would pay for a new one, would you at least want to know?"

### "How did you get my number?"
> "We use public records and neighborhood data. I'm reaching out specifically because [REASON: weather event, home age]."`,
    },

    // FOLLOW-UP (2)
    {
      title: "Post-Inspection Follow-Up Cadence",
      description: "3-5-7 day follow-up schedule with scripts for nurturing undecided prospects",
      category: "follow-up",
      type: "guide",
      stage: "contacted",
      scenario: "undecided prospect",
      tags: ["follow-up", "nurture", "cadence", "touchpoints"],
      content: `# Post-Inspection Follow-Up Cadence

## Day 1: Same-Day Follow-Up

**Text Message:**
> "Hi [NAME], great meeting you today! Attached are the photos from your roof inspection. I'll give you a call in a couple days to go over next steps. Text me with any questions! —[YOUR NAME]"

## Day 3: Check-In Call
> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. Did you have a chance to look over the inspection report? [If yes] Great, what questions came up?"

**If no answer, leave voicemail:**
> "Hi [NAME], just wanted to follow up on your roof inspection. If you have any questions, give me a call at [NUMBER]."

## Day 5: Value-Add Touch
> "Hi [NAME], just came across this article about [RELEVANT TOPIC]. Thought you might find it useful. [LINK]"

## Day 7: The "Last Check-In" Call
> "Hi [NAME], I just wanted to check in one more time. Is this still something you're considering, or should I hold off for now?"

## Tracking Your Follow-Ups
| Customer | Inspection Date | Day 1 | Day 3 | Day 5 | Day 7 |
|----------|-----------------|-------|-------|-------|-------|

## Pro Tips
- Never "just check in"—always provide value
- Text > email for response rates
- Document what they said for the next call`,
    },
    {
      title: "Lost Deal Win-Back Playbook",
      description: "Re-engagement strategies after a prospect chooses a competitor",
      category: "follow-up",
      type: "script",
      stage: "closed",
      scenario: "lost deal",
      tags: ["win-back", "lost-deal", "re-engage", "follow-up"],
      content: `# Lost Deal Win-Back Playbook

## Immediate Response (When They Tell You No)

**If they chose a competitor:**
> "I appreciate you letting me know. May I ask what made the difference? Price, timing, or something else?

> "If for any reason things don't work out, don't hesitate to reach out. Good luck with the project."

## The 30-Day Check-In
> "Hi [NAME], it's [YOUR NAME] from Guardian. How did the roof project go?"

**If there were problems:**
> "That's frustrating. If you need help sorting it out—or want a second opinion—I'm happy to take a look. No charge."

**If work hasn't started:**
> "If you'd like to revisit your options, I'm here. My schedule is filling up for [SEASON]."

## The Seasonal Outreach

**After a Storm:**
> "Hi [NAME], I hope you're safe after last night's storm. I know we talked about your roof a while back—just wanted to offer a free inspection if you want to make sure everything's okay."

## Pro Tips
- Never badmouth the competitor
- Position yourself as the helpful fallback
- Keep all lost deals in your CRM with follow-up reminders`,
    },

    // RETENTION (1)
    {
      title: "Annual Maintenance Upsell Script",
      description: "Script for reaching out to existing customers about maintenance programs",
      category: "retention",
      type: "script",
      stage: "closed",
      scenario: "existing customer",
      tags: ["retention", "maintenance", "upsell", "recurring"],
      content: `# Annual Maintenance Upsell Script

## The Outreach Call

**Opening:**
> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. How are you doing?

> "I'm calling because it's been about [TIME] since we completed your roof, and I wanted to check in. How's everything holding up?"

**Introduce the Program:**
> "The reason I'm calling is that we've launched an annual maintenance program. Here's how it works: Once a year, we send a technician for a full roof inspection. We check for wear and tear, clear debris from gutters, and give you a full report.

> "If we find anything minor, we take care of it on the spot—no extra charge. Plus, members get priority scheduling during storm season."

## Handling Objections

### "I don't think I need that."
> "I hear you—your roof is in great shape right now. The thing is, small issues can build up without you noticing. We've found loose nails and cracked sealant during routine checks that would've caused leaks if we hadn't caught them."

### "That sounds expensive."
> "A typical roof repair runs $300-$1,500. The maintenance program is [PRICE] for the whole year, and it often prevents those repairs entirely."

## The Close
> "Can I get you set up? We're scheduling maintenance visits for [MONTH]. I can put you on the calendar now."`,
    },

    // PRESENTATION (1)
    {
      title: "In-Home Proposal Presentation",
      description: "Step-by-step guide for presenting proposals and closing in the home",
      category: "presentation",
      type: "guide",
      stage: "proposal",
      scenario: "in-home meeting",
      tags: ["presentation", "proposal", "in-home", "closing"],
      content: `# In-Home Proposal Presentation

## Pre-Presentation Checklist
- [ ] Confirm all decision-makers will be present
- [ ] Proposal is printed AND available digitally
- [ ] Tablet charged with inspection photos ready
- [ ] Contract ready for signature

## Setting the Stage
> "So here's what we're going to cover: First, I'll walk you through the inspection findings. Then we'll look at the proposal. Finally, we'll address any questions. Sound good?"

## Reviewing the Inspection
**Share photos on tablet:**
> "These are the photos I took during my inspection. Let me walk you through what I found."

Point out specific issues with photos:
- "This is where the shingles are cupping—a sign of age."
- "This is hail damage—notice the circular impact marks."

## Presenting the Proposal
> "The total investment for a full roof replacement is [AMOUNT]. That includes tear-off, new underlayment, [SHINGLE TYPE], new flashing, and a 10-year workmanship warranty.

> "We're looking at a [X]-day installation window. I can have you on the schedule for [DATE]."

## The Close
> "So, [NAME], based on everything we've discussed—does this look like the right solution for your home?"

**If they say yes:**
> "Great. Let me grab the contract. I just need your signature here."

**If they hesitate:**
> "What's giving you pause? Let's talk through it."

## After They Sign
> "Materials will be ordered today. Our project manager will call you [X] days before the install. Any questions?"`,
    },
  ];

  for (const pb of playbooksData) {
    await prisma.playbook.create({
      data: {
        title: pb.title,
        description: pb.description,
        category: pb.category,
        type: pb.type,
        content: pb.content,
        stage: pb.stage,
        scenario: pb.scenario,
        tags: pb.tags ? JSON.stringify(pb.tags) : null,
        author: "Guardian Team",
        isPublished: true,
        usageCount: randomInt(10, 200),
        rating: randomFloat(3.5, 5.0, 1),
      },
    });
  }
  console.log(`   ✓ Created ${playbooksData.length} playbooks\n`);

  // Summary
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ SEED COMPLETE!");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`
📊 Data Summary:
   • Users:          ${allReps.length}
   • Customers:      ${customers.length}
   • Weather Events: ${weatherEvents.length}
   • Intel Items:    ${intelCount}
   • Interactions:   ${interactionCount}
   • Playbooks:      ${playbooksData.length}
   
   Total Records:    ${allReps.length + customers.length + weatherEvents.length + intelCount + interactionCount + playbooksData.length}

📅 Date Range: ${START_DATE.toLocaleDateString()} - ${END_DATE.toLocaleDateString()}

🔑 Demo Credentials:
   Manager: demo.manager@guardian.com / GuardianDemo2026!
   Rep:     demo.rep@guardian.com / GuardianDemo2026!
`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
