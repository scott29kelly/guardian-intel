/**
 * Prisma Database Seed Script
 * 
 * Populates the database with initial data:
 * - Demo users (rep and manager)
 * - Sample customers from Guardian service areas
 * - Weather events
 * - Intel items
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Secure demo password - same for all demo accounts
const DEMO_PASSWORD = "GuardianDemo2026!";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ==========================================================================
  // USERS
  // ==========================================================================
  console.log("👤 Creating users...");

  const hashedPassword = await hashPassword(DEMO_PASSWORD);

  const manager = await prisma.user.upsert({
    where: { email: "demo.manager@guardian.com" },
    update: {},
    create: {
      email: "demo.manager@guardian.com",
      password: hashedPassword,
      name: "Sarah Mitchell",
      role: "manager",
      phone: "(215) 555-0100",
      isActive: true,
      totalDeals: 45,
      totalRevenue: 892000,
      avgDealSize: 19822,
      closeRate: 34,
      monthlyTarget: 150000,
    },
  });

  const rep = await prisma.user.upsert({
    where: { email: "demo.rep@guardian.com" },
    update: {},
    create: {
      email: "demo.rep@guardian.com",
      password: hashedPassword,
      name: "James Rodriguez",
      role: "rep",
      phone: "(215) 555-0101",
      isActive: true,
      managerId: manager.id,
      totalDeals: 28,
      totalRevenue: 456000,
      avgDealSize: 16286,
      closeRate: 28,
      monthlyTarget: 100000,
    },
  });

  console.log(`   ✓ Created manager: ${manager.email}`);
  console.log(`   ✓ Created rep: ${rep.email}`);

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================
  console.log("\n🏠 Creating customers...");

  const customers = [
    {
      firstName: "Michael",
      lastName: "Henderson",
      email: "m.henderson@email.com",
      phone: "(215) 234-5678",
      address: "4521 Oak Ridge Drive",
      city: "Southampton",
      state: "PA",
      zipCode: "18966",
      propertyType: "single-family",
      yearBuilt: 1998,
      squareFootage: 2850,
      roofType: "asphalt shingle",
      roofAge: 18,
      propertyValue: 425000,
      insuranceCarrier: "State Farm",
      policyType: "HO-3",
      deductible: 2500,
      leadScore: 92,
      urgencyScore: 88,
      profitPotential: 18500,
      status: "prospect",
      stage: "qualified",
      assignedRepId: manager.id,
    },
    {
      firstName: "Jennifer",
      lastName: "Walsh",
      email: "j.walsh@email.com",
      phone: "(215) 345-6789",
      address: "892 Maple Street",
      city: "Doylestown",
      state: "PA",
      zipCode: "18901",
      propertyType: "single-family",
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
      status: "lead",
      stage: "contacted",
      assignedRepId: rep.id,
    },
    {
      firstName: "Robert",
      lastName: "Chen",
      email: "r.chen@email.com",
      phone: "(215) 456-7890",
      address: "1245 Birch Lane",
      city: "Bensalem",
      state: "PA",
      zipCode: "19020",
      propertyType: "single-family",
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
      status: "prospect",
      stage: "proposal",
      assignedRepId: manager.id,
    },
    {
      firstName: "Amanda",
      lastName: "Foster",
      email: "a.foster@email.com",
      phone: "(540) 567-8901",
      address: "3678 Pine Valley Court",
      city: "Fredericksburg",
      state: "VA",
      zipCode: "22401",
      propertyType: "single-family",
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
      status: "lead",
      stage: "new",
      assignedRepId: rep.id,
    },
    {
      firstName: "Thomas",
      lastName: "Anderson",
      email: "t.anderson@email.com",
      phone: "(856) 789-0123",
      address: "2891 Riverside Drive",
      city: "Cherry Hill",
      state: "NJ",
      zipCode: "08003",
      propertyType: "single-family",
      yearBuilt: 2001,
      squareFootage: 3500,
      roofType: "Architectural Shingle",
      roofAge: 15,
      propertyValue: 595000,
      insuranceCarrier: "Liberty Mutual",
      policyType: "HO-3",
      deductible: 2000,
      leadScore: 89,
      urgencyScore: 82,
      profitPotential: 24500,
      status: "prospect",
      stage: "negotiation",
      assignedRepId: manager.id,
    },
    {
      firstName: "Patricia",
      lastName: "Williams",
      email: "p.williams@email.com",
      phone: "(302) 890-1234",
      address: "445 Huntington Park",
      city: "Wilmington",
      state: "DE",
      zipCode: "19801",
      propertyType: "single-family",
      yearBuilt: 1995,
      squareFootage: 2200,
      roofType: "3-Tab Shingle",
      roofAge: 22,
      propertyValue: 345000,
      insuranceCarrier: "Farmers",
      policyType: "HO-3",
      deductible: 1500,
      leadScore: 91,
      urgencyScore: 85,
      profitPotential: 15800,
      status: "prospect",
      stage: "negotiation",
      assignedRepId: rep.id,
    },
    {
      firstName: "Christopher",
      lastName: "Brown",
      email: "c.brown@email.com",
      phone: "(410) 901-2345",
      address: "1122 Summit Street",
      city: "Baltimore",
      state: "MD",
      zipCode: "21201",
      propertyType: "single-family",
      yearBuilt: 1988,
      squareFootage: 2650,
      roofType: "Asphalt Shingle",
      roofAge: 20,
      propertyValue: 475000,
      insuranceCarrier: "State Farm",
      policyType: "HO-5",
      deductible: 2500,
      leadScore: 97,
      urgencyScore: 95,
      profitPotential: 19200,
      status: "closed-won",
      stage: "closed",
      assignedRepId: manager.id,
    },
    {
      firstName: "Steven",
      lastName: "Garcia",
      email: "s.garcia@email.com",
      phone: "(914) 345-6780",
      address: "901 High Street",
      city: "Yonkers",
      state: "NY",
      zipCode: "10701",
      propertyType: "single-family",
      yearBuilt: 1990,
      squareFootage: 2450,
      roofType: "Cedar Shake",
      roofAge: 25,
      propertyValue: 520000,
      insuranceCarrier: "Chubb",
      policyType: "HO-5",
      deductible: 5000,
      leadScore: 72,
      urgencyScore: 68,
      profitPotential: 42000,
      status: "customer",
      stage: "qualified",
      assignedRepId: manager.id,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { 
        id: `seed-${customer.email}` 
      },
      update: customer,
      create: {
        id: `seed-${customer.email}`,
        ...customer,
      },
    });
  }

  console.log(`   ✓ Created ${customers.length} customers`);

  // ==========================================================================
  // WEATHER EVENTS
  // ==========================================================================
  console.log("\n⛈️  Creating weather events...");

  const weatherEvents = [
    {
      latitude: 40.1773,
      longitude: -75.0035,
      city: "Southampton",
      state: "PA",
      county: "Bucks",
      zipCode: "18966",
      eventType: "hail",
      eventDate: new Date("2026-01-02"),
      severity: "severe",
      hailSize: 1.25,
      source: "NOAA",
      affectedRadius: 5,
      affectedCustomers: 45,
    },
    {
      latitude: 40.3101,
      longitude: -75.1299,
      city: "Doylestown",
      state: "PA",
      county: "Bucks",
      zipCode: "18901",
      eventType: "wind",
      eventDate: new Date("2025-12-28"),
      severity: "severe",
      windSpeed: 65,
      windGust: 78,
      source: "NOAA",
      affectedRadius: 8,
      affectedCustomers: 32,
    },
    {
      latitude: 40.1046,
      longitude: -74.9518,
      city: "Bensalem",
      state: "PA",
      county: "Bucks",
      zipCode: "19020",
      eventType: "hail",
      eventDate: new Date("2025-12-15"),
      severity: "moderate",
      hailSize: 0.75,
      source: "NOAA",
      affectedRadius: 3,
      affectedCustomers: 28,
    },
    {
      latitude: 38.3032,
      longitude: -77.4605,
      city: "Fredericksburg",
      state: "VA",
      county: "Spotsylvania",
      zipCode: "22401",
      eventType: "thunderstorm",
      eventDate: new Date("2025-11-20"),
      severity: "moderate",
      windSpeed: 55,
      hailSize: 0.5,
      source: "NOAA",
      affectedRadius: 6,
      affectedCustomers: 18,
    },
  ];

  for (const event of weatherEvents) {
    await prisma.weatherEvent.create({
      data: event,
    });
  }

  console.log(`   ✓ Created ${weatherEvents.length} weather events`);

  // ==========================================================================
  // INTEL ITEMS
  // ==========================================================================
  console.log("\n🔍 Creating intel items...");

  // Get created customers for linking
  const createdCustomers = await prisma.customer.findMany({
    where: { id: { startsWith: "seed-" } },
    take: 5,
  });

  if (createdCustomers.length > 0) {
    const intelItems = [
      {
        customerId: createdCustomers[0].id,
        source: "weather-api",
        category: "weather",
        title: "Recent Hail Event Detected",
        content: "1.25 inch hail reported in area on Jan 2, 2026. High probability of roof damage based on shingle age and storm severity.",
        confidence: 94,
        actionable: true,
        priority: "critical",
      },
      {
        customerId: createdCustomers[0].id,
        source: "property-api",
        category: "property",
        title: "Roof Age Exceeds Warranty",
        content: "18-year-old asphalt shingle roof. Most manufacturer warranties expire at 15-20 years. Prime candidate for replacement.",
        confidence: 100,
        actionable: true,
        priority: "high",
      },
      {
        customerId: createdCustomers[1].id,
        source: "web-search",
        category: "social",
        title: "Recent Home Purchase",
        content: "Property records show home purchased 8 months ago. New homeowners often invest in improvements and maintenance.",
        confidence: 100,
        actionable: false,
        priority: "medium",
      },
      {
        customerId: createdCustomers[2].id,
        source: "weather-api",
        category: "weather",
        title: "Multiple Storm Events",
        content: "3 significant weather events in past 6 months. Wind gusts up to 65mph recorded. Recommend thorough inspection.",
        confidence: 91,
        actionable: true,
        priority: "critical",
      },
    ];

    for (const intel of intelItems) {
      await prisma.intelItem.create({
        data: intel,
      });
    }

    console.log(`   ✓ Created ${intelItems.length} intel items`);
  }

  // ==========================================================================
  // PLAYBOOKS
  // ==========================================================================
  console.log("\n📚 Creating playbooks...");

  const playbooks = [
    {
      title: "Storm Damage Opener",
      description: "Initial contact script for storm-affected properties",
      category: "discovery",
      type: "script",
      content: `# Storm Damage Initial Contact

## Opening
"Hi [Name], this is [Your Name] from Guardian Roofing. I'm reaching out because we've been helping homeowners in [Area] after the recent storm. Have you had a chance to check your roof for any damage?"

## Key Points
- Reference specific storm date and type (hail/wind)
- Offer free inspection
- Mention insurance claim assistance

## Objection Handlers
- "I already have someone" → "Great! Have they checked your insurance coverage? We specialize in maximizing claims."
- "No damage" → "That's good to hear! Would you like a free inspection just to document your roof's condition for insurance purposes?"

## Close
"I have availability [Day] at [Time]. Would that work for a quick 15-minute inspection?"`,
      stage: "new",
      scenario: "storm-lead",
      isPublished: true,
    },
    {
      title: "Insurance Claim Process Guide",
      description: "Step-by-step guide for filing and managing insurance claims",
      category: "closing",
      type: "guide",
      content: `# Insurance Claim Process

## Step 1: Document the Damage
- Take photos before any temporary repairs
- Note the storm date and type
- Document visible damage from ground level

## Step 2: File the Claim
- Call insurance company's claims line
- Provide storm date and description
- Request an adjuster inspection

## Step 3: Adjuster Meeting
- Be present during inspection
- Point out all damage areas
- Provide contractor's estimate if available

## Step 4: Review Settlement
- Compare to contractor estimate
- Request re-inspection if underpaid
- File supplement if needed

## Key Tips
- Always get three estimates
- Keep all documentation
- Know your policy's depreciation clause`,
      stage: "proposal",
      isPublished: true,
    },
  ];

  for (const playbook of playbooks) {
    await prisma.playbook.upsert({
      where: { id: `seed-${playbook.title.toLowerCase().replace(/\s+/g, "-")}` },
      update: playbook,
      create: {
        id: `seed-${playbook.title.toLowerCase().replace(/\s+/g, "-")}`,
        ...playbook,
      },
    });
  }

  console.log(`   ✓ Created ${playbooks.length} playbooks`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log("\n✅ Database seed completed!\n");
  console.log("Demo Login Credentials:");
  console.log("------------------------");
  console.log(`Manager: demo.manager@guardian.com / ${DEMO_PASSWORD}`);
  console.log(`Rep:     demo.rep@guardian.com / ${DEMO_PASSWORD}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
