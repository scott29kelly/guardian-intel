/**
 * Database Seed Script
 * 
 * Populates the database with initial data matching the mock-data.ts structure.
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  console.log("  Clearing existing data...");
  await prisma.intelItem.deleteMany();
  await prisma.weatherEvent.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.insuranceClaim.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dailyMetrics.deleteMany();

  // Create Users (Sales Reps)
  console.log("  Creating users...");
  const passwordHash = await hash("password123", 12);
  
  const sarahMitchell = await prisma.user.create({
    data: {
      email: "sarah.mitchell@guardian.com",
      name: "Sarah Mitchell",
      password: passwordHash,
      role: "rep",
      phone: "(555) 100-0001",
      isActive: true,
      totalDeals: 8,
      totalRevenue: 142000,
      avgDealSize: 17750,
      closeRate: 34,
      monthlyTarget: 200000,
    },
  });

  const jamesRodriguez = await prisma.user.create({
    data: {
      email: "james.rodriguez@guardian.com",
      name: "James Rodriguez",
      password: passwordHash,
      role: "rep",
      phone: "(555) 100-0002",
      isActive: true,
      totalDeals: 6,
      totalRevenue: 118000,
      avgDealSize: 19666,
      closeRate: 28,
      monthlyTarget: 175000,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "admin@guardian.com",
      name: "Admin User",
      password: passwordHash,
      role: "admin",
      phone: "(555) 100-0000",
      isActive: true,
      monthlyTarget: 0,
    },
  });

  // Map rep names to user IDs
  const repMap: Record<string, string> = {
    "Sarah Mitchell": sarahMitchell.id,
    "James Rodriguez": jamesRodriguez.id,
  };

  // Create Customers
  console.log("  Creating customers...");
  const customersData = [
    {
      firstName: "Michael",
      lastName: "Henderson",
      email: "m.henderson@email.com",
      phone: "(555) 234-5678",
      address: "4521 Oak Ridge Drive",
      city: "Columbus",
      state: "OH",
      zipCode: "43215",
      county: "Franklin",
      latitude: 39.9612,
      longitude: -82.9988,
      propertyType: "single-family",
      yearBuilt: 1998,
      squareFootage: 2850,
      roofType: "Asphalt Shingle",
      roofAge: 18,
      propertyValue: 425000,
      estimatedJobValue: 18500,
      insuranceCarrier: "State Farm",
      policyType: "HO-3",
      deductible: 2500,
      leadScore: 92,
      urgencyScore: 88,
      profitPotential: 18500,
      churnRisk: 12,
      status: "prospect",
      stage: "qualified",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Jennifer",
      lastName: "Walsh",
      email: "j.walsh@email.com",
      phone: "(555) 345-6789",
      address: "892 Maple Street",
      city: "Dublin",
      state: "OH",
      zipCode: "43017",
      county: "Franklin",
      latitude: 40.0992,
      longitude: -83.114,
      propertyType: "single-family",
      yearBuilt: 2005,
      squareFootage: 3200,
      roofType: "Architectural Shingle",
      roofAge: 12,
      propertyValue: 525000,
      estimatedJobValue: 22000,
      insuranceCarrier: "Allstate",
      policyType: "HO-5",
      deductible: 1000,
      leadScore: 78,
      urgencyScore: 65,
      profitPotential: 22000,
      churnRisk: 25,
      status: "lead",
      stage: "contacted",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "Robert",
      lastName: "Chen",
      email: "r.chen@email.com",
      phone: "(555) 456-7890",
      address: "1245 Birch Lane",
      city: "Westerville",
      state: "OH",
      zipCode: "43081",
      county: "Franklin",
      latitude: 40.1262,
      longitude: -82.9296,
      propertyType: "single-family",
      yearBuilt: 1992,
      squareFootage: 2400,
      roofType: "3-Tab Shingle",
      roofAge: 24,
      propertyValue: 375000,
      estimatedJobValue: 16500,
      insuranceCarrier: "Progressive",
      policyType: "HO-3",
      deductible: 2000,
      leadScore: 95,
      urgencyScore: 94,
      profitPotential: 16500,
      churnRisk: 8,
      status: "prospect",
      stage: "proposal",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Amanda",
      lastName: "Foster",
      email: "a.foster@email.com",
      phone: "(555) 567-8901",
      address: "3678 Pine Valley Court",
      city: "Powell",
      state: "OH",
      zipCode: "43065",
      county: "Delaware",
      latitude: 40.1578,
      longitude: -83.0752,
      propertyType: "single-family",
      yearBuilt: 2010,
      squareFootage: 4100,
      roofType: "Metal Standing Seam",
      roofAge: 8,
      propertyValue: 685000,
      estimatedJobValue: 35000,
      insuranceCarrier: "USAA",
      policyType: "HO-5",
      deductible: 5000,
      leadScore: 45,
      urgencyScore: 30,
      profitPotential: 35000,
      churnRisk: 55,
      status: "lead",
      stage: "new",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "David",
      lastName: "Martinez",
      email: "d.martinez@email.com",
      phone: "(555) 678-9012",
      address: "567 Walnut Street",
      city: "Reynoldsburg",
      state: "OH",
      zipCode: "43068",
      county: "Franklin",
      latitude: 39.9551,
      longitude: -82.8133,
      propertyType: "single-family",
      yearBuilt: 1985,
      squareFootage: 1950,
      roofType: "Asphalt Shingle",
      roofAge: 28,
      propertyValue: 285000,
      estimatedJobValue: 14000,
      insuranceCarrier: "Nationwide",
      policyType: "HO-3",
      deductible: 1500,
      leadScore: 88,
      urgencyScore: 92,
      profitPotential: 14000,
      churnRisk: 15,
      status: "customer",
      stage: "closed",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Thomas",
      lastName: "Anderson",
      email: "t.anderson@email.com",
      phone: "(555) 789-0123",
      address: "2891 Riverside Drive",
      city: "Upper Arlington",
      state: "OH",
      zipCode: "43221",
      county: "Franklin",
      latitude: 39.9945,
      longitude: -83.0624,
      propertyType: "single-family",
      yearBuilt: 2001,
      squareFootage: 3500,
      roofType: "Architectural Shingle",
      roofAge: 15,
      propertyValue: 595000,
      estimatedJobValue: 24500,
      insuranceCarrier: "Liberty Mutual",
      policyType: "HO-3",
      deductible: 2000,
      leadScore: 89,
      urgencyScore: 82,
      profitPotential: 24500,
      churnRisk: 18,
      status: "prospect",
      stage: "negotiation",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Patricia",
      lastName: "Williams",
      email: "p.williams@email.com",
      phone: "(555) 890-1234",
      address: "445 Huntington Park",
      city: "Grandview Heights",
      state: "OH",
      zipCode: "43212",
      county: "Franklin",
      latitude: 39.9784,
      longitude: -83.0405,
      propertyType: "single-family",
      yearBuilt: 1995,
      squareFootage: 2200,
      roofType: "3-Tab Shingle",
      roofAge: 22,
      propertyValue: 345000,
      estimatedJobValue: 15800,
      insuranceCarrier: "Farmers",
      policyType: "HO-3",
      deductible: 1500,
      leadScore: 91,
      urgencyScore: 85,
      profitPotential: 15800,
      churnRisk: 10,
      status: "prospect",
      stage: "negotiation",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "Christopher",
      lastName: "Brown",
      email: "c.brown@email.com",
      phone: "(555) 901-2345",
      address: "1122 Summit Street",
      city: "Bexley",
      state: "OH",
      zipCode: "43209",
      county: "Franklin",
      latitude: 39.9687,
      longitude: -82.9376,
      propertyType: "single-family",
      yearBuilt: 1988,
      squareFootage: 2650,
      roofType: "Asphalt Shingle",
      roofAge: 20,
      propertyValue: 475000,
      estimatedJobValue: 19200,
      insuranceCarrier: "State Farm",
      policyType: "HO-5",
      deductible: 2500,
      leadScore: 97,
      urgencyScore: 95,
      profitPotential: 19200,
      churnRisk: 5,
      status: "closed-won",
      stage: "closed",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Elizabeth",
      lastName: "Davis",
      email: "e.davis@email.com",
      phone: "(555) 012-3456",
      address: "3344 Olentangy River Road",
      city: "Clintonville",
      state: "OH",
      zipCode: "43214",
      county: "Franklin",
      latitude: 40.0451,
      longitude: -83.0185,
      propertyType: "single-family",
      yearBuilt: 2008,
      squareFootage: 2100,
      roofType: "Architectural Shingle",
      roofAge: 10,
      propertyValue: 385000,
      estimatedJobValue: 17500,
      insuranceCarrier: "Allstate",
      policyType: "HO-3",
      deductible: 1000,
      leadScore: 98,
      urgencyScore: 90,
      profitPotential: 17500,
      churnRisk: 3,
      status: "closed-won",
      stage: "closed",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "James",
      lastName: "Wilson",
      email: "j.wilson@email.com",
      phone: "(555) 123-4567",
      address: "778 Schrock Road",
      city: "Westerville",
      state: "OH",
      zipCode: "43081",
      county: "Franklin",
      latitude: 40.1262,
      longitude: -82.9296,
      propertyType: "single-family",
      yearBuilt: 2003,
      squareFootage: 2800,
      roofType: "Asphalt Shingle",
      roofAge: 14,
      propertyValue: 425000,
      estimatedJobValue: 21000,
      insuranceCarrier: "Progressive",
      policyType: "HO-3",
      deductible: 2000,
      leadScore: 35,
      urgencyScore: 25,
      profitPotential: 21000,
      churnRisk: 85,
      status: "closed-lost",
      stage: "closed",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Linda",
      lastName: "Taylor",
      email: "l.taylor@email.com",
      phone: "(555) 234-5679",
      address: "556 Morse Road",
      city: "Gahanna",
      state: "OH",
      zipCode: "43230",
      county: "Franklin",
      latitude: 40.0212,
      longitude: -82.8793,
      propertyType: "single-family",
      yearBuilt: 2000,
      squareFootage: 2300,
      roofType: "3-Tab Shingle",
      roofAge: 18,
      propertyValue: 355000,
      estimatedJobValue: 16800,
      insuranceCarrier: "Nationwide",
      policyType: "HO-3",
      deductible: 1500,
      leadScore: 28,
      urgencyScore: 20,
      profitPotential: 16800,
      churnRisk: 90,
      status: "closed-lost",
      stage: "closed",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "Steven",
      lastName: "Garcia",
      email: "s.garcia@email.com",
      phone: "(555) 345-6780",
      address: "901 High Street",
      city: "Worthington",
      state: "OH",
      zipCode: "43085",
      county: "Franklin",
      latitude: 40.0931,
      longitude: -83.0179,
      propertyType: "single-family",
      yearBuilt: 1990,
      squareFootage: 2450,
      roofType: "Cedar Shake",
      roofAge: 25,
      propertyValue: 520000,
      estimatedJobValue: 42000,
      insuranceCarrier: "Chubb",
      policyType: "HO-5",
      deductible: 5000,
      leadScore: 72,
      urgencyScore: 68,
      profitPotential: 42000,
      churnRisk: 30,
      status: "customer",
      stage: "qualified",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Nancy",
      lastName: "Moore",
      email: "n.moore@email.com",
      phone: "(555) 456-7891",
      address: "2234 Henderson Road",
      city: "Columbus",
      state: "OH",
      zipCode: "43220",
      county: "Franklin",
      latitude: 39.9936,
      longitude: -83.0784,
      propertyType: "single-family",
      yearBuilt: 2012,
      squareFootage: 3100,
      roofType: "Architectural Shingle",
      roofAge: 8,
      propertyValue: 465000,
      estimatedJobValue: 19500,
      insuranceCarrier: "Erie Insurance",
      policyType: "HO-3",
      deductible: 1000,
      leadScore: 55,
      urgencyScore: 40,
      profitPotential: 19500,
      churnRisk: 45,
      status: "lead",
      stage: "qualified",
      assignedRepId: repMap["James Rodriguez"],
    },
    {
      firstName: "Kevin",
      lastName: "Thompson",
      email: "k.thompson@email.com",
      phone: "(555) 567-8902",
      address: "4456 Sawmill Road",
      city: "Dublin",
      state: "OH",
      zipCode: "43017",
      county: "Franklin",
      latitude: 40.0992,
      longitude: -83.114,
      propertyType: "single-family",
      yearBuilt: 1997,
      squareFootage: 3800,
      roofType: "Slate",
      roofAge: 28,
      propertyValue: 725000,
      estimatedJobValue: 85000,
      insuranceCarrier: "AIG",
      policyType: "HO-5",
      deductible: 10000,
      leadScore: 82,
      urgencyScore: 78,
      profitPotential: 85000,
      churnRisk: 22,
      status: "prospect",
      stage: "proposal",
      assignedRepId: repMap["Sarah Mitchell"],
    },
    {
      firstName: "Michelle",
      lastName: "Jackson",
      email: "m.jackson@email.com",
      phone: "(555) 678-9013",
      address: "887 Tuttle Crossing",
      city: "Dublin",
      state: "OH",
      zipCode: "43016",
      county: "Franklin",
      latitude: 40.0753,
      longitude: -83.1321,
      propertyType: "single-family",
      yearBuilt: 2015,
      squareFootage: 2950,
      roofType: "Architectural Shingle",
      roofAge: 5,
      propertyValue: 545000,
      estimatedJobValue: 23500,
      insuranceCarrier: "USAA",
      policyType: "HO-3",
      deductible: 2500,
      leadScore: 42,
      urgencyScore: 28,
      profitPotential: 23500,
      churnRisk: 65,
      status: "lead",
      stage: "new",
      assignedRepId: repMap["James Rodriguez"],
    },
  ];

  const customers: Array<{ id: string; firstName: string; lastName: string }> = [];
  for (const data of customersData) {
    const customer = await prisma.customer.create({ data });
    customers.push({ id: customer.id, firstName: data.firstName, lastName: data.lastName });
  }

  // Create a map for easy lookup
  const customerIdMap = new Map(
    customers.map((c, i) => [String(i + 1), c.id])
  );

  // Create Intel Items
  console.log("  Creating intel items...");
  const intelItemsData = [
    { customerId: "1", source: "weather-api", category: "weather", title: "Recent Hail Event Detected", content: "1.25 inch hail reported in area on Jan 2, 2026. High probability of roof damage based on shingle age and storm severity.", confidence: 94, actionable: true, priority: "critical" },
    { customerId: "1", source: "property-api", category: "property", title: "Roof Age Exceeds Warranty", content: "18-year-old asphalt shingle roof. Most manufacturer warranties expire at 15-20 years. Prime candidate for replacement.", confidence: 100, actionable: true, priority: "high" },
    { customerId: "1", source: "insurance-lookup", category: "insurance", title: "State Farm - Favorable Claim History", content: "Carrier known for smooth claims process. Customer has no prior claims in 5 years - good standing for new claim.", confidence: 87, actionable: true, priority: "medium" },
    { customerId: "3", source: "weather-api", category: "weather", title: "Multiple Storm Events", content: "3 significant weather events in past 6 months. Wind gusts up to 65mph recorded. Recommend thorough inspection.", confidence: 91, actionable: true, priority: "critical" },
    { customerId: "3", source: "property-api", category: "property", title: "Aging 3-Tab Shingles", content: "24-year-old 3-tab shingles significantly past expected lifespan. Visible granule loss likely. High conversion probability.", confidence: 95, actionable: true, priority: "high" },
    { customerId: "2", source: "web-search", category: "social", title: "Recent Home Purchase", content: "Property records show home purchased 8 months ago. New homeowners often invest in improvements and maintenance.", confidence: 100, actionable: false, priority: "medium" },
    { customerId: "5", source: "crm-sync", category: "sales", title: "Contract Signed - Production Ready", content: "Customer signed contract for full roof replacement. Materials ordered. Awaiting crew scheduling.", confidence: 100, actionable: true, priority: "high" },
    { customerId: "6", source: "weather-api", category: "weather", title: "Wind Damage Potential", content: "60mph wind gusts recorded in Upper Arlington area. 15-year shingles may have lifted edges.", confidence: 88, actionable: true, priority: "high" },
    { customerId: "6", source: "crm-sync", category: "sales", title: "Price Negotiation Active", content: "Customer reviewing final pricing. Competitor quote received - need to address value proposition.", confidence: 100, actionable: true, priority: "critical" },
    { customerId: "7", source: "property-api", category: "property", title: "Aging Roof System", content: "22-year-old 3-tab shingles past expected lifespan. Insurance may require replacement for renewal.", confidence: 92, actionable: true, priority: "high" },
    { customerId: "7", source: "insurance-lookup", category: "insurance", title: "Farmers - Standard Process", content: "Carrier requires documented damage photos. Prepare comprehensive inspection report.", confidence: 85, actionable: true, priority: "medium" },
    { customerId: "8", source: "crm-sync", category: "sales", title: "Deal Won - Premium Package", content: "Customer selected premium architectural shingles with extended warranty. High margin deal.", confidence: 100, actionable: true, priority: "high" },
    { customerId: "9", source: "crm-sync", category: "sales", title: "Installation Scheduled", content: "Full roof replacement confirmed. Crew assigned for Jan 15-17. Materials in transit.", confidence: 100, actionable: true, priority: "high" },
    { customerId: "10", source: "crm-sync", category: "sales", title: "Lost to Competitor", content: "Customer chose ABC Roofing - cited lower price. Consider follow-up in 6 months.", confidence: 100, actionable: false, priority: "low" },
    { customerId: "11", source: "crm-sync", category: "sales", title: "Decided Not to Proceed", content: "Customer postponing roof work. Budget constraints cited. Re-engage in spring.", confidence: 100, actionable: false, priority: "low" },
    { customerId: "12", source: "property-api", category: "property", title: "Premium Cedar Shake - Specialty Work", content: "Cedar shake roof requires specialized crew. High-value restoration opportunity.", confidence: 95, actionable: true, priority: "high" },
    { customerId: "14", source: "property-api", category: "property", title: "Slate Roof Assessment Needed", content: "28-year-old slate roof. Requires specialized inspection. Potential $85K+ project.", confidence: 90, actionable: true, priority: "critical" },
  ];

  for (const item of intelItemsData) {
    const customerId = customerIdMap.get(item.customerId);
    if (customerId) {
      await prisma.intelItem.create({
        data: {
          customerId,
          source: item.source,
          category: item.category,
          title: item.title,
          content: item.content,
          confidence: item.confidence,
          actionable: item.actionable,
          priority: item.priority,
        },
      });
    }
  }

  // Create Weather Events
  console.log("  Creating weather events...");
  const weatherEventsData = [
    { customerId: "1", eventType: "hail", eventDate: new Date("2026-01-02"), severity: "severe", hailSize: 1.25, latitude: 39.9612, longitude: -82.9988, source: "NOAA" },
    { customerId: "3", eventType: "wind", eventDate: new Date("2025-12-15"), severity: "moderate", windSpeed: 58, latitude: 40.1262, longitude: -82.9296, source: "NOAA" },
    { customerId: "3", eventType: "hail", eventDate: new Date("2025-10-20"), severity: "moderate", hailSize: 0.75, latitude: 40.1262, longitude: -82.9296, source: "NOAA" },
    { customerId: "5", eventType: "wind", eventDate: new Date("2025-11-08"), severity: "severe", windSpeed: 65, damageReported: true, claimFiled: true, latitude: 39.9551, longitude: -82.8133, source: "NOAA" },
    { customerId: "6", eventType: "wind", eventDate: new Date("2026-01-04"), severity: "moderate", windSpeed: 60, latitude: 39.9945, longitude: -83.0624, source: "NOAA" },
    { customerId: "7", eventType: "hail", eventDate: new Date("2025-12-28"), severity: "moderate", hailSize: 0.88, latitude: 39.9784, longitude: -83.0405, source: "NOAA" },
    { customerId: "8", eventType: "hail", eventDate: new Date("2025-12-20"), severity: "severe", hailSize: 1.5, damageReported: true, claimFiled: true, latitude: 39.9687, longitude: -82.9376, source: "NOAA" },
    { customerId: "9", eventType: "wind", eventDate: new Date("2025-11-15"), severity: "moderate", windSpeed: 55, damageReported: true, claimFiled: true, latitude: 40.0451, longitude: -83.0185, source: "NOAA" },
    { customerId: "12", eventType: "wind", eventDate: new Date("2026-01-03"), severity: "moderate", windSpeed: 52, latitude: 40.0931, longitude: -83.0179, source: "NOAA" },
    { customerId: "14", eventType: "hail", eventDate: new Date("2026-01-06"), severity: "severe", hailSize: 1.75, latitude: 40.0992, longitude: -83.114, source: "NOAA" },
  ];

  for (const event of weatherEventsData) {
    const customerId = customerIdMap.get(event.customerId);
    if (customerId) {
      await prisma.weatherEvent.create({
        data: {
          customerId,
          eventType: event.eventType,
          eventDate: event.eventDate,
          severity: event.severity,
          hailSize: event.hailSize,
          windSpeed: event.windSpeed,
          damageReported: event.damageReported || false,
          claimFiled: event.claimFiled || false,
          latitude: event.latitude,
          longitude: event.longitude,
          source: event.source,
        },
      });
    }
  }

  // Create Daily Metrics
  console.log("  Creating daily metrics...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyMetrics.create({
    data: {
      date: today,
      userId: null, // Company-wide
      newLeads: 12,
      qualifiedLeads: 8,
      contactedLeads: 15,
      callsMade: 47,
      callsConnected: 28,
      emailsSent: 23,
      textsSent: 12,
      visitsMade: 6,
      proposalsSent: 4,
      proposalValue: 87500,
      dealsClosed: 2,
      revenueWon: 34500,
      revenueLost: 21000,
      avgDealSize: 17250,
      weatherAlerts: 3,
      stormLeads: 15,
      leadToContactRate: 0.65,
      contactToQualRate: 0.53,
      qualToProposalRate: 0.50,
      proposalToCloseRate: 0.50,
    },
  });

  // Create sample playbooks
  console.log("  Creating playbooks...");
  await prisma.playbook.create({
    data: {
      title: "Storm Damage Discovery",
      description: "Questions and talking points for initial storm damage assessment calls",
      category: "discovery",
      type: "script",
      content: `# Storm Damage Discovery Call

## Opening
"Hi [Name], this is [Your Name] from Guardian Storm Repair. We're reaching out because our weather intelligence system detected significant storm activity in your area recently. Do you have a few minutes to discuss your property?"

## Key Questions
1. "Were you home during the storm on [date]?"
2. "Have you noticed any visible damage to your roof or exterior?"
3. "How old is your current roof?"
4. "Who is your insurance carrier?"

## Value Proposition
- Free professional inspection
- Experience with [Carrier] claims process
- Local crews available immediately

## Close
"I'd like to offer you a complimentary inspection. We can typically identify damage that's not visible from the ground. Would [day] or [day] work better for your schedule?"`,
      stage: "new",
      scenario: "storm-lead",
      isPublished: true,
    },
  });

  await prisma.playbook.create({
    data: {
      title: "Insurance Objection Handling",
      description: "Responses to common insurance-related objections",
      category: "objection-handling",
      type: "guide",
      content: `# Insurance Objection Responses

## "My insurance won't cover it"
"I understand that concern. However, storm damage is typically covered under your homeowner's policy. We work with [Carrier] regularly and can help document the damage properly. Would you be open to a free inspection to see if there's claimable damage?"

## "My deductible is too high"
"That's a valid consideration. Keep in mind that if there's significant damage, the replacement value often far exceeds the deductible. Plus, we can help identify all affected areas to maximize your claim. Shall we take a look?"

## "I already had an adjuster out"
"Great that you've started the process! Sometimes initial adjustments miss damage that a roofing specialist can identify. We often find supplemental items that can be added to your claim. Mind if we provide a second opinion?"`,
      stage: "qualified",
      scenario: "insurance-objection",
      isPublished: true,
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`   - ${customers.length} customers`);
  console.log(`   - ${intelItemsData.length} intel items`);
  console.log(`   - ${weatherEventsData.length} weather events`);
  console.log(`   - 3 users (admin, 2 reps)`);
  console.log(`   - 2 playbooks`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
