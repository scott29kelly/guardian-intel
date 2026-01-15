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

  // Create playbooks (15+ for demo requirements)
  console.log("📚 Creating playbooks...");
  const playbooks = [
    // Storm Response Category
    { title: "Storm Response Protocol", description: "Step-by-step guide for responding to storm events", category: "follow-up", type: "checklist" },
    { title: "Hail Damage Assessment", description: "Complete guide to identifying and documenting hail damage on roofs", category: "discovery", type: "guide" },
    { title: "Wind Damage Quick Check", description: "Rapid assessment checklist for wind-damaged properties", category: "discovery", type: "checklist" },
    // Discovery Category
    { title: "New Lead Qualification", description: "Process for qualifying inbound leads", category: "discovery", type: "guide" },
    { title: "Door Knock Script", description: "Effective door-to-door canvassing approach", category: "discovery", type: "script" },
    { title: "Commercial Lead Process", description: "Handling commercial roofing opportunities", category: "discovery", type: "guide" },
    // Objection Handling Category  
    { title: "Competitive Win-Back", description: "Strategy for winning back lost opportunities", category: "objection-handling", type: "script" },
    { title: "Price Objection Handler", description: "Scripts and strategies for addressing pricing concerns", category: "objection-handling", type: "script" },
    { title: "Timeline Objection Response", description: "How to handle customers who want to wait", category: "objection-handling", type: "script" },
    // Closing Category
    { title: "Referral Generation", description: "Maximizing referrals from happy customers", category: "closing", type: "template" },
    { title: "Annual Maintenance Program", description: "Selling maintenance agreements", category: "closing", type: "script" },
    { title: "Insurance Claim Closing", description: "Closing techniques specific to insurance-funded jobs", category: "closing", type: "script" },
    // Follow-up Category
    { title: "Emergency Response", description: "Handling emergency roof repairs", category: "follow-up", type: "checklist" },
    { title: "Post-Installation Follow-up", description: "Ensuring customer satisfaction after job completion", category: "follow-up", type: "checklist" },
    { title: "30-Day Check-In Script", description: "Follow-up call script for post-installation satisfaction", category: "follow-up", type: "script" },
    // Presentation Category
    { title: "Insurance Claim Support", description: "Helping customers navigate insurance claims", category: "presentation", type: "guide" },
    { title: "Roof Options Presentation", description: "How to present different roofing material options", category: "presentation", type: "template" },
    { title: "Warranty Explanation Guide", description: "Explaining manufacturer and workmanship warranties", category: "presentation", type: "guide" },
  ];

  for (const pb of playbooks) {
    await prisma.playbook.create({
      data: {
        title: pb.title,
        description: pb.description,
        category: pb.category,
        type: pb.type,
        content: `# ${pb.title}\n\n${pb.description}\n\n## Steps\n\n1. Initial assessment\n2. Customer contact\n3. Evaluation\n4. Proposal\n5. Follow-up`,
        stage: randomElement(["new", "contacted", "qualified", "proposal", "negotiation"]),
        scenario: randomElement(["homeowner hesitant", "budget concerns", "competitor quote", "insurance claim", null]),
        author: "Guardian Team",
        isPublished: true,
        usageCount: randomInt(10, 200),
        rating: randomFloat(3.5, 5.0, 1),
      },
    });
  }
  console.log(`   ✓ Created ${playbooks.length} playbooks\n`);

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
   • Playbooks:      ${playbooks.length}
   
   Total Records:    ${allReps.length + customers.length + weatherEvents.length + intelCount + interactionCount + playbooks.length}

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
