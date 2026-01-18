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
  // INTERACTIONS (Activity Data for Analytics)
  // ==========================================================================
  console.log("\n📞 Creating interactions...");

  // Get created customers for linking interactions
  const allCustomers = await prisma.customer.findMany({
    where: { id: { startsWith: "seed-" } },
  });

  const interactionTypes = ["call", "email", "text", "visit", "meeting"];
  const outcomes = ["connected", "voicemail", "no-answer", "scheduled", "callback"];
  const sentiments = ["positive", "neutral", "negative"];

  // Generate interactions spread across the last 30 days
  const interactions = [];
  const now = new Date();

  for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // More activity on weekdays, less on weekends
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const activityCount = isWeekend ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 8) + 4;
    
    for (let i = 0; i < activityCount; i++) {
      const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
      const user = Math.random() > 0.4 ? manager : rep; // More activity from manager in demo
      
      // Set random time during business hours
      const interactionDate = new Date(date);
      interactionDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      
      interactions.push({
        customerId: customer.id,
        userId: user.id,
        type,
        direction: Math.random() > 0.3 ? "outbound" : "inbound",
        subject: type === "call" 
          ? "Follow-up call" 
          : type === "email" 
          ? "Proposal follow-up"
          : type === "meeting"
          ? "In-home consultation"
          : type === "visit"
          ? "Property inspection"
          : "Quick check-in",
        content: `${type.charAt(0).toUpperCase() + type.slice(1)} with ${customer.firstName} ${customer.lastName}`,
        outcome: type === "call" ? outcomes[Math.floor(Math.random() * outcomes.length)] : "connected",
        sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
        duration: type === "call" ? Math.floor(Math.random() * 600) + 60 : null, // 1-10 min calls
        createdAt: interactionDate,
      });
    }
  }

  // Bulk create interactions
  for (const interaction of interactions) {
    await prisma.interaction.create({
      data: interaction,
    });
  }

  console.log(`   ✓ Created ${interactions.length} interactions`);

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
    // =========================================================================
    // STORM RESPONSE (2)
    // =========================================================================
    {
      title: "Storm Damage Door Knock Script",
      description: "Full canvassing script for storm-affected neighborhoods with weather-specific hooks and urgency builders",
      category: "storm",
      type: "script",
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

**If they say "Yes" or seem concerned:**
> "I figured you might have seen something. Would you like me to take a closer look? I can document everything for your insurance claim—no obligation whatsoever."

## Discovery Questions
1. "How old is your roof? Do you remember when it was last replaced?"
2. "Have you noticed any leaks or water stains inside?"
3. "Who's your insurance carrier? Some are easier to work with than others."
4. "Is this something you and [spouse's name] would decide on together?"

## Key Talking Points
- **Urgency:** "Insurance companies are only accepting claims from this storm for another [X] days."
- **Social Proof:** "We've already helped 15 homeowners on this street alone."
- **Risk Reduction:** "If I don't find anything, you're all set. If I do, you'll want to know before your next leak."
- **Value Add:** "I'll also check your gutters, siding, and vents while I'm up there—no extra charge."

## Objection Handlers

### "I'm not interested"
> "Totally understand. Quick question though—if there WAS damage and your insurance would cover the whole thing, would you want to at least know about it? That's all I'm offering—free information."

### "I already had someone look"
> "Perfect! Who did you use? [Listen] Great. Did they file the claim for you, or did they just give you an estimate? We specialize in the insurance side—we've gotten homeowners an average of $8,000 more than their initial settlement."

### "I need to talk to my spouse"
> "Absolutely—big decisions should be made together. What if I just took some photos of the damage today so you have something concrete to discuss? I can leave everything with you and follow up tomorrow."

### "How do I know you're legit?"
> "Great question—you SHOULD ask that. Here's my card, here's my insurance certificate, and here's our BBB A+ rating. We've been in business for 12 years and we're headquartered right here in [CITY]."

## Setting the Appointment
> "Here's what I'd suggest: Let me get on the roof right now for about 10 minutes. I'll take photos of anything I find, and if there IS damage, we can schedule a time for you and [SPOUSE] to meet with me together. Sound fair?"

**Alternative close:**
> "I've got about 20 minutes right now. Can I go ahead and take a look?"

## After the Inspection
> "Here's what I found... [show photos on tablet]. This is textbook hail damage—see how the granules are knocked off in a circle pattern? Your insurance should cover this at 100% minus your deductible. Would you like me to be here when the adjuster comes out?"

## Red Flags to Watch For
- 🚩 Homeowner mentions they're selling soon (might not invest)
- 🚩 Very new roof (less than 3 years) without visible damage
- 🚩 Homeowner has had multiple contractors out (price shopping)
- 🚩 Vacant house or "I'm just renting"

## Pro Tips
- **Mirror their energy.** If they're rushed, be concise. If they're chatty, build rapport.
- **Use their name.** "Well, Jennifer, what I noticed was..."
- **Leave something behind.** Even if they say no, leave a door hanger or flyer.
- **Ask for referrals.** "Before I go—do any of your neighbors have older roofs I should check on?"`,
      stage: "new",
      scenario: "storm canvassing",
      tags: JSON.stringify(["door-knock", "canvassing", "storm", "hail", "wind"]),
      isPublished: true,
    },
    {
      title: "Emergency Tarp & Repair Protocol",
      description: "Checklist for emergency roof situations including tarp installs and temporary repairs",
      category: "storm",
      type: "checklist",
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
   - Photos of interior damage (stains, wet areas)
   - Video walkthrough if extensive

2. **Get signed authorization**
   - Use Emergency Repair Authorization form
   - Explain this is temporary, not a permanent fix
   - Clarify: "This prevents further damage while we work with your insurance."

## Tarp Installation Steps
1. Measure the damaged area + 4 feet on all sides
2. Lay 2x4s along the top edge of tarp (under the tarp)
3. Roll tarp over the 2x4, nail through tarp into decking
4. Stretch tarp tight over damaged area
5. Secure bottom edge with additional 2x4s and nails
6. Fold and seal all edges to prevent wind lift

## Emergency Repair Pricing
| Service | Homeowner Cost | Insurance Billable |
|---------|---------------|-------------------|
| Tarp (up to 10x12) | $250 | $350-500 |
| Tarp (up to 20x30) | $450 | $600-800 |
| Temporary shingle patch | $150-300 | $300-500 |
| Interior dryout coordination | Varies | Document for claim |

## Insurance Documentation Packet
Create a folder for the homeowner with:
- [ ] Your photos (timestamped)
- [ ] Storm report/NOAA data
- [ ] Emergency repair invoice
- [ ] Guardian contact info
- [ ] "Next Steps" instruction sheet

## What to Say to the Homeowner
> "We've got the tarp on securely—this will protect your home until we can do the full replacement. I've documented everything for your insurance claim. Your next step is to call your insurance company at [NUMBER] and file a claim for the [DATE] storm. I can be here when the adjuster comes out to make sure nothing gets missed. Does [DAY] at [TIME] work for a follow-up?"

## Red Flags
- 🚩 Homeowner refuses to sign authorization
- 🚩 Damage doesn't match storm date (may be pre-existing)
- 🚩 Structural damage beyond roof—refer to structural engineer
- 🚩 Homeowner wants to skip insurance and pay cash for full job

## Pro Tips
- Always upsell the full inspection: "While I'm up here, let me check the whole roof."
- Leave Guardian marketing materials at neighboring houses
- Emergency tarps almost always convert to full jobs—treat them as VIPs
- Get the insurance claim number before leaving if possible`,
      stage: "new",
      scenario: "emergency response",
      tags: JSON.stringify(["emergency", "tarp", "storm", "leak", "urgent"]),
      isPublished: true,
    },

    // =========================================================================
    // OBJECTION HANDLING (3)
    // =========================================================================
    {
      title: "Price Objection Playbook",
      description: "5+ proven rebuttals for 'too expensive' and price objections with psychological framing techniques",
      category: "objection-handling",
      type: "script",
      content: `# Price Objection Playbook

## Understanding the Objection
When someone says "it's too expensive," they're really saying one of three things:
1. "I don't have the money" (budget issue)
2. "I don't see the value" (perception issue)
3. "I'm not ready to decide" (timing/stall)

Your job is to figure out which one—and address THAT.

## The Magic Question
Before responding to ANY price objection, say this:
> "I appreciate you being upfront with me. Can I ask—when you say it's too expensive, do you mean compared to your budget, compared to another quote you received, or compared to what you expected?"

*This gets them to reveal the REAL objection.*

## Rebuttal #1: "Too Expensive Compared to Budget"

> "I totally understand—this is a significant investment. Let me ask you this: if your insurance approves the claim, your out-of-pocket is just your deductible, which is [AMOUNT]. Is that more manageable?"

**If they're paying cash:**
> "We do offer financing options—some homeowners spread this over 12-24 months at 0% interest. Would that help make this work for you?"

## Rebuttal #2: "Too Expensive Compared to Another Quote"

> "I'm glad you're getting multiple quotes—that's smart. Can I see what they offered? [Review competitor quote] I notice they're using [3-tab shingles / no starter strip / shorter warranty]. Here's what that means in 5 years..."

**Key differentiators to highlight:**
- Warranty length (workmanship vs. manufacturer)
- Material quality (architectural vs. 3-tab)
- Insurance assistance (we handle the whole claim)
- Local presence (we're here if something goes wrong)
- BBB rating and reviews

> "Let me ask you this: if you knew both roofs would last the same amount of time, would price be the only factor? [Wait for answer] The difference is, our roof WILL last longer, and we'll be here to back it up."

## Rebuttal #3: "Just Seems Expensive Overall"

> "I hear you. Let me put it in perspective: this roof protects a [VALUE] home and everything inside it. It's going to last 25-30 years. That's less than [$/month] over its lifetime. Compared to what you'd pay for a single water damage repair—which can run $10,000-$50,000—this is actually the most affordable protection you can buy."

## Rebuttal #4: The "Apples to Apples" Close

> "Here's what I want you to do. Take our quote and their quote. Circle every line item—materials, labor, warranty, insurance handling. If theirs is truly cheaper for the SAME scope, I want to know about it because I'll match it. But if there are differences, I want you to understand what you're giving up for that lower price."

## Rebuttal #5: The "Cheap Roof" Story

> "Can I tell you a quick story? Last month I got called to a house on [STREET]. The homeowner had gone with the cheapest bid three years ago. They saved $2,000 upfront. But the contractor had used cheap underlayment, skipped the ice and water shield, and didn't install the flashing properly. Now they have $15,000 in water damage AND they need a new roof. They're going to spend more than if they'd just done it right the first time. I don't want that for you."

## When Price Really IS the Issue

Sometimes they genuinely can't afford it. Here's what to offer:
1. **Financing:** 12-24 months, often 0% promotional rate
2. **Phased work:** "Let's do the urgent repairs now, and plan for full replacement in spring."
3. **Insurance claim:** "Let's file the claim first and see what they approve—you might be surprised."
4. **Referral discount:** "If you refer a neighbor who books with us, I can knock $500 off your project."

## Never Say This
❌ "That's the best I can do"
❌ "You get what you pay for"
❌ "We're not the cheapest"

## Always Say This
✅ "Help me understand what's driving that concern"
✅ "What would make this feel like a good investment?"
✅ "Let's see if we can make this work for your situation"

## Pro Tips
- Never be the first to mention price. Let them bring it up.
- If you sense price sensitivity, frame the insurance angle early.
- When comparing to competitors, never trash-talk—just contrast.
- Always end with: "Is price the only thing holding you back?"`,
      stage: "negotiation",
      scenario: "price objection",
      tags: JSON.stringify(["objection", "price", "closing", "negotiation"]),
      isPublished: true,
    },
    {
      title: "Insurance Claim Hesitation Handler",
      description: "Handling homeowner fears about filing insurance claims and premium increases",
      category: "objection-handling",
      type: "script",
      content: `# Insurance Claim Hesitation Handler

## Common Fears
1. "My premiums will go up"
2. "They'll drop me if I file a claim"
3. "I don't want to deal with my insurance company"
4. "I'd rather just pay out of pocket"

## Rebuttal #1: "My Premiums Will Go Up"

> "I totally understand that concern—it's one of the most common questions I get. Here's what most people don't know: for storm damage claims, your premium typically does NOT increase. Why? Because it's not your fault. Weather is an 'act of God'—insurance companies expect these claims, and they price their policies assuming you'll use them for exactly this.

> "Think of it this way: you've been paying premiums for years specifically to cover situations like this. If you don't use your coverage now, you're essentially throwing that money away. Your neighbor files a claim—same storm—and they get a new roof. You don't file, you pay out of pocket, AND your rates might still go up because of all the claims in your area anyway."

**Supporting fact to share:**
> "In [STATE], insurers are not allowed to raise your rate or drop you for a single weather-related claim. It's actually in the law."

## Rebuttal #2: "They'll Drop Me"

> "That's a fair worry, but let me share some data with you: Insurance companies don't drop customers for one claim—especially not for storm damage. What CAN get you dropped is multiple claims in a short period or claims that suggest negligence—like a burst pipe you ignored for months.

> "Actually, NOT filing can hurt you more. If you don't document this damage now and then have a leak next year, the insurance company will say it was pre-existing and deny the claim entirely. Filing now actually protects you."

## Rebuttal #3: "I Don't Want to Deal With Insurance"

> "I hear you—nobody enjoys that process. Here's the good news: you don't have to deal with them. That's literally what we do every single day. I'll meet with the adjuster, I'll explain the damage, I'll handle the supplement if the first estimate is too low. You just sign the paperwork and we take it from there.

> "I've worked with every major carrier in the area—State Farm, Allstate, Liberty Mutual—and I know exactly how to document the damage so they approve it the first time. You focus on your life; I'll focus on your roof."

## Rebuttal #4: "I'd Rather Just Pay Cash"

> "I respect that—it's your home and your choice. But let me ask you this: If you could get a new roof for [DEDUCTIBLE] instead of [FULL PRICE], why wouldn't you?

> "You've already paid for this coverage. You pay your premiums every single month. Using your insurance for storm damage is exactly what it's for. This isn't 'taking advantage'—this is getting what you paid for.

> "And here's the thing: if you pay cash now, and then file a claim later for another issue, the insurance company might ask why you didn't file for THIS storm. It could complicate future claims."

## The "Let Me Check" Approach

If they're still hesitant:
> "Tell you what—let me do this for free: I'll submit the damage documentation to your insurance company just to see what they say. If they approve the claim, great—you get a new roof for your deductible. If they don't, you haven't lost anything and you're not obligated to move forward. Either way, you'll have a professional damage report for your records. Fair?"

## Addressing Specific Carriers

**State Farm:**
> "State Farm is actually one of the better companies to work with—their adjusters are fair and they move quickly. I've gotten [X] claims approved with them in just the past month."

**Allstate:**
> "Allstate can be thorough, which is a good thing. They want to see detailed documentation, and that's exactly what I provide. We have a great track record with them."

**Progressive/GEICO (auto insurers with home policies):**
> "These companies are newer to home insurance, which means their adjusters sometimes miss things. That's where having a contractor who knows what to look for really helps."

## What NOT to Say
❌ Don't guarantee claim approval
❌ Don't bash their insurance company
❌ Don't minimize their concerns
❌ Don't pressure them to file

## Closing Lines
> "At the end of the day, this is your decision. But I've seen too many homeowners pay $15,000 out of pocket for something their insurance would have covered. I don't want that for you. Let's at least file and see what happens. What do you say?"

## Pro Tips
- Bring printed info showing state insurance regulations
- Share success stories: "Last week I helped a homeowner on Oak Street..."
- Offer to call the insurance company together right then
- Always get the policy number and carrier during inspection`,
      stage: "qualified",
      scenario: "insurance fear",
      tags: ["objection", "insurance", "claim", "hesitation"],
      isPublished: true,
    },
    {
      title: '"I Need to Think About It" Response',
      description: "Creating urgency without pressure when prospects stall or delay decisions",
      category: "objection-handling",
      type: "script",
      content: `# "I Need to Think About It" Response

## What They're Really Saying
"I need to think about it" is rarely about thinking. It usually means:
- They're not convinced of the value
- They have an unspoken objection
- They want to shop around
- They need approval from someone else
- They're uncomfortable saying no

## Step 1: Acknowledge and Isolate

> "I completely understand—this is a big decision and you should feel good about it. Before you think it over, can I ask: is there something specific that's giving you pause? I'd rather address it now than have you wondering about it later."

*Wait for their response. Don't fill the silence.*

## Step 2: Address the Real Objection

**If they mention price:**
Jump to the Price Objection Playbook.

**If they mention spouse/partner:**
> "Makes total sense. When do you think you could discuss it with [NAME]? I'm happy to come back when you're both available—that way I can answer any questions they have too."

**If they mention other quotes:**
> "I'd encourage you to get other opinions—this is a significant investment. Quick question though: besides price, what else will you be comparing? [Wait] Here's what I'd suggest looking at..." [Pivot to value differentiators]

**If they seem genuinely uncertain:**
> "Can you help me understand what's weighing on you? Is it the timing, the investment, the company—what feels uncertain?"

## Step 3: Create Legitimate Urgency

**Storm-related deadline:**
> "I want to be upfront with you: insurance companies typically accept claims from a storm for 6-12 months. We're already [X] months out from that [DATE] storm. If you wait too long, you might miss that window entirely."

**Material pricing:**
> "I should mention—shingle prices are going up [X]% next month due to supply chain issues. If we can get your order in by [DATE], I can lock in current pricing. After that, I can't guarantee the same number."

**Crew scheduling:**
> "We're booked about 3 weeks out right now. If you want to get on the schedule for before [SEASON/HOLIDAY], I'd need your go-ahead by [DATE]. Otherwise, we're looking at [LATER DATE]."

**Weather window:**
> "With winter coming, we've only got a few more weeks of good installation weather. If we wait until spring, you'll be dealing with another season of potential leaks."

## Step 4: Offer a Low-Commitment Next Step

If they truly won't budge:
> "Tell you what—I don't want you to feel pressured. How about this: I'll leave you all the documentation, and I'll check back in [2-3 days]. In the meantime, if you have ANY questions, text or call me directly. Sound good?"

**Alternative:**
> "Why don't I schedule the adjuster meeting for [DATE]? You don't have to commit to anything—we're just getting the insurance company's opinion. If they approve it, then you can make your decision. If they don't, then there's nothing to think about. Fair?"

## Step 5: The Soft Close

> "I hear you. Let me just ask one more thing: if you WERE going to move forward, is there anything about our proposal you'd want different? Price, timeline, materials—anything?"

*Listen carefully. Their answer tells you the real objection.*

## Red Flags That They're Not Closing

- 🚩 They won't give you a timeline ("I'll call you when I'm ready")
- 🚩 They won't share the other quotes they're getting
- 🚩 They mention financial hardship unrelated to the job
- 🚩 They've already told two other contractors they "need to think about it"

## Know When to Walk Away

Sometimes "I need to think about it" means no. That's okay. Leave on good terms:
> "I totally respect that. Here's my card—if anything changes or you want to revisit this in the future, give me a call. I'll also check in with you in about a month just to see how things are going. No pressure, just wanted to stay in touch. Sound good?"

## Follow-Up Cadence

| Day | Action |
|-----|--------|
| Day 2 | Text: "Hi [NAME], just wanted to check in—any questions come up as you were thinking things over?" |
| Day 5 | Call (if no response): Leave a voicemail with a time-sensitive reason to reconnect |
| Day 10 | Email with a piece of value (storm update, financing promo, etc.) |
| Day 30 | Final check-in: "Still happy to help if timing is better now" |

## Pro Tips
- Never argue or get defensive
- "Think about it" is an opportunity to uncover real objections
- The goal is a DEFINITE answer—even "no" is better than limbo
- Document everything they say for your follow-up`,
      stage: "proposal",
      scenario: "stall tactic",
      tags: JSON.stringify(["objection", "stall", "think-about-it", "urgency"]),
      isPublished: true,
    },

    // =========================================================================
    // CLOSING (2)
    // =========================================================================
    {
      title: "The Assumptive Close",
      description: "Script for confident deal closure using assumptive language and commitment questions",
      category: "closing",
      type: "script",
      content: `# The Assumptive Close

## What Is an Assumptive Close?
An assumptive close skips the "do you want to move forward?" question and instead assumes the answer is yes. You move straight into logistics: scheduling, payment, next steps.

**Why it works:** It's confident (not pushy), it eliminates the awkward "so... do you want to do it?" moment, and it makes saying yes feel natural.

## The Setup
Before you can use an assumptive close, you need:
✅ Completed inspection with documented damage
✅ Homeowner has seen the photos/evidence
✅ Insurance claim filed or discussion about payment
✅ Spouse/decision-makers present (or confirmed approval)
✅ No major unaddressed objections

## Assumptive Language Patterns

**Instead of:** "Would you like to move forward?"
**Say:** "Let's get you on the schedule. What works better for you—mornings or afternoons?"

**Instead of:** "Are you ready to sign?"
**Say:** "I just need your signature here and we'll get the materials ordered."

**Instead of:** "Do you want to go with the upgraded shingles?"
**Say:** "I'm going to put you down for the architectural shingles—they look great on homes like yours."

## The Transition

After reviewing the proposal, don't pause and wait for a decision. Transition smoothly:

> "Okay, [NAME], here's where we're at: your insurance approved the claim at [AMOUNT], your deductible is [AMOUNT], and we're looking at a [TIMEFRAME] installation window. I've got availability starting [DATE]. Let me grab the paperwork and we'll get you locked in."

*Pull out the contract. Start filling in their name.*

## If They Hesitate

Sometimes they'll pause or look at each other. That's normal. Don't panic. Let the silence work.

If they speak up:
- **"We need to discuss this privately."** → "Of course. I'll step outside for a few minutes. Take your time."
- **"That's a lot of money."** → "I understand. Remember, after your deductible, the rest is covered by insurance. You're really only paying [DEDUCTIBLE]."
- **"Can we have a day to think about it?"** → "Sure. Just so I can hold your spot, let me pencil you in for [DATE]. If you change your mind, just call me and I'll release it. Fair?"

## The Paperwork Moment

When you hand them the pen:
> "I just need your signature right here—this authorizes us to order materials and get you on the schedule. Once we're on the books, I'll send you a confirmation email with your project manager's contact info."

**Don't say:**
- "No pressure, but..."
- "Take your time..."
- "You don't have to sign today..."

## Backup Close: The Calendar Close

If they're waffling, pivot to scheduling instead of signing:
> "Let me ask you this—if we WERE going to do the installation, what week works best for you? Are you flexible, or do you have anything coming up I should work around?"

Once they've mentally scheduled it, signing feels like a formality.

## Backup Close: The Either/Or

> "So I can put in the order—did you want to go with the Owens Corning Onyx Black, or did you prefer that Brownwood color we talked about?"

They're not choosing whether to buy—they're choosing which option.

## What Happens After They Sign

Immediately:
1. Thank them genuinely (not effusively)
2. Explain exactly what happens next
3. Give them your direct contact info
4. Confirm the installation date in writing

> "You made a great decision. Here's what happens next: I'll submit the materials order today, our operations team will call you to confirm the installation date, and you'll get a pre-job checklist by email. Any questions before I head out?"

## Common Mistakes to Avoid
❌ Asking "Do you have any more questions?" after they've agreed (invites doubt)
❌ Overselling after the close (they already said yes—stop talking)
❌ Rushing out the door (makes them feel like a transaction)
❌ Forgetting to set expectations for next steps

## Pro Tips
- Confidence is key. If you seem uncertain, they'll feel uncertain.
- Never apologize for the price or the paperwork.
- Keep the contract conversation brief—don't re-explain every line.
- After they sign, shift to "partnership" mode: "We're going to take great care of your home."`,
      stage: "proposal",
      scenario: "ready to close",
      tags: JSON.stringify(["closing", "assumptive", "contract", "signature"]),
      isPublished: true,
    },
    {
      title: "Insurance Claim Close",
      description: "Walking customers through the signing process when an insurance claim is involved",
      category: "closing",
      type: "script",
      content: `# Insurance Claim Close

## The Insurance Claim Closing Process

Closing an insurance job is different from a retail sale. The customer isn't paying the full price—insurance is. Your job is to:
1. Explain how the payment works
2. Collect the deductible and assignment of benefits
3. Make them feel confident you'll handle everything

## Before the Close: Confirm These Items
- [ ] Insurance claim approved or adjuster meeting scheduled
- [ ] Scope of work matches insurance estimate
- [ ] Homeowner understands their deductible amount
- [ ] Any supplements have been discussed
- [ ] Decision-makers are present

## The Financial Explanation

> "Let me walk you through how the money works—it's simpler than most people think.

> "Your insurance approved the claim at [TOTAL AMOUNT]. They'll send you a check for [AMOUNT MINUS DEPRECIATION]—that's the ACV, or 'actual cash value.' Once we complete the work, they'll release the remaining [DEPRECIATION AMOUNT]—that's called the depreciation holdback.

> "Your only out-of-pocket is your deductible: [DEDUCTIBLE AMOUNT]. That's due when we start the job.

> "So to recap: Insurance pays [AMOUNT], you pay [DEDUCTIBLE], and you get a brand new roof. Sound good?"

## Collecting the Deductible

> "For the deductible, we accept check, credit card, or financing if you'd prefer to spread it out. What works best for you?"

**If they want to finance:**
> "No problem—we can do 12 months same-as-cash, meaning if you pay it off within the year, zero interest. Let me pull up the application; it takes about 2 minutes."

## The Assignment of Benefits (AOB)

> "This form right here is called the Assignment of Benefits. What it does is authorize us to deal directly with your insurance company on your behalf. That means I handle all the paperwork, the supplements, and any back-and-forth—so you don't have to.

> "It doesn't cost you anything extra, and it doesn't affect your policy. It just makes my job easier and your life simpler. Any questions before you sign?"

## Handling Depreciation Concerns

**If they're confused about depreciation:**
> "Think of it like this: Insurance pays for the 'used' value upfront and holds back money for the 'new' value until the work is done. Once I send them photos of the completed job, they release the rest. It's a built-in protection so they know the work actually got done. Makes sense?"

**If they're worried they won't get the depreciation back:**
> "I've been doing this for [X] years. I've never had a claim where we didn't recover the full depreciation. As long as we complete the work per the scope, the check comes. I'll handle the whole process."

## Addressing Out-of-Pocket Supplements

Sometimes the scope needs to be adjusted after the insurance approval:
> "There's one thing I want to flag: the insurance scope covers [X], but when we actually open up the roof, we might find some decking damage or other issues that need to be fixed. If that happens, we'll document it and file a supplement with your insurance for additional coverage. In most cases, they approve it. If for some reason they don't, I'll discuss your options before doing any extra work. Fair?"

## The Final Close

> "Alright, here's where we're at: [Summarize scope]. I've got a crew available starting [DATE]. All I need is your signature here [point to contract], here [point to AOB], and the deductible, and we'll get your materials ordered today.

> "Is there anything else you'd like me to explain before we get you on the schedule?"

*Hand them the pen. Stay quiet.*

## After They Sign

> "Perfect. You're all set. Here's what happens next:
> 1. I'll order materials today—they'll arrive in about [X] days.
> 2. Our project manager [NAME] will call you 2 days before installation to confirm.
> 3. On install day, the crew arrives around 7-8 AM. Plan for [X] days of work.
> 4. I'll handle the insurance depreciation release—you don't need to do anything.

> "Any questions? Great. [Handshake] We're going to take great care of your home."

## Common Mistakes to Avoid
❌ Promising a specific depreciation amount before it's confirmed
❌ Collecting full payment before insurance issues the check
❌ Forgetting to explain the supplement process
❌ Not confirming the deductible amount matches their policy

## Pro Tips
- Always bring a physical contract—digital signing feels less personal
- If they're nervous about signing, read the key terms aloud
- Send a follow-up email/text within 1 hour confirming everything
- Take a photo of the signed contract before leaving (backup)`,
      stage: "proposal",
      scenario: "insurance job",
      tags: ["closing", "insurance", "deductible", "aob"],
      isPublished: true,
    },

    // =========================================================================
    // DISCOVERY (2)
    // =========================================================================
    {
      title: "Initial Consultation Framework",
      description: "First meeting structure for understanding homeowner needs and building rapport",
      category: "discovery",
      type: "guide",
      content: `# Initial Consultation Framework

## Purpose of the First Meeting
The initial consultation is NOT about selling—it's about:
1. Building rapport and trust
2. Understanding their specific situation
3. Identifying pain points and motivations
4. Positioning yourself as a trusted advisor

## Pre-Meeting Preparation (5 min)
Before you arrive:
- [ ] Review any notes from the initial contact
- [ ] Check weather history for their area
- [ ] Look up the property on Zillow/county records
- [ ] Prepare inspection tools and documentation

## The Arrival (2 min)
- Park on the street, not in their driveway
- Take a quick look at the roof from your car
- Ring the doorbell; stand back 4-5 feet
- Smile, introduce yourself, shake hands

> "Hi, I'm [NAME] with Guardian Roofing. Thanks for making time for me today. Before we get started—how's your day going?"

## Building Rapport (3-5 min)
Find common ground:
- Comment on something specific: pets, garden, home decor
- Ask how long they've lived there
- Mention if you've worked in the neighborhood before

> "This is a great neighborhood—we actually just finished a roof about two blocks over on [STREET]. Have you been here long?"

## The Discovery Phase (10-15 min)

### Open-Ended Questions
1. "What prompted you to reach out about your roof?"
2. "Have you noticed any specific issues—leaks, missing shingles, anything like that?"
3. "How old is your current roof, if you know?"
4. "Have you had any roofing work done since you've lived here?"
5. "Have you been affected by any of the recent storms?"

### Dig Deeper
- "Tell me more about that..."
- "When did you first notice that?"
- "How has that affected you?"
- "What would happen if you didn't address it?"

### Motivation Questions
6. "What's driving the timing on this? Is it something urgent or more of a 'when we get around to it' thing?"
7. "Have you gotten any other quotes or opinions?"
8. "If we did find damage, how would you want to handle it—insurance, out of pocket, financing?"
9. "Is this something you and [SPOUSE] would decide together?"

## Understanding Their Decision Process
> "I want to make sure I'm helpful and not pushy, so let me ask: what does your decision process look like? Do you typically need time to compare options, or do you prefer to handle things quickly once you have the information?"

*Listen carefully. Tailor your close accordingly.*

## The Property Walk (5 min)
> "Mind if we take a quick walk around the outside? I want to see the roof from ground level, check the gutters and siding, and look for any obvious signs of wear."

Point out observations as you go:
- "See those granules in the gutter? That's a sign of aging shingles."
- "That flashing around the chimney looks a little lifted."
- "These look like impact marks—could be hail damage."

## Transitioning to the Inspection
> "Based on what you've told me and what I'm seeing from the ground, I'd like to get up on the roof and take a closer look. It'll take about 15-20 minutes. I'll document everything with photos, and then we can sit down and I'll show you exactly what I find. Sound good?"

## Common Mistakes to Avoid
❌ Jumping into "sales mode" too quickly
❌ Talking more than listening
❌ Ignoring body language or cues that they're uncomfortable
❌ Assuming you know their situation before they tell you

## Pro Tips
- Use their name frequently (but naturally)
- Mirror their energy—if they're chatty, engage; if they're busy, be efficient
- Take written notes; it shows you care
- Always ask: "Is there anything I haven't asked about that I should know?"`,
      stage: "new",
      scenario: "first visit",
      tags: JSON.stringify(["discovery", "consultation", "rapport", "first-meeting"]),
      isPublished: true,
    },
    {
      title: "Roof Age & History Discovery",
      description: "Questions and techniques to uncover roof replacement triggers and timeline",
      category: "discovery",
      type: "script",
      content: `# Roof Age & History Discovery

## Why This Matters
Knowing the roof's age, history, and previous repairs helps you:
- Assess remaining lifespan
- Identify past problems that might recur
- Understand what they've already invested
- Build urgency if replacement is due

## Opening Questions

### If They Know the Roof Age
> "Great, so it's about [X] years old. Do you remember if it came with the house or if you had it replaced after you moved in?"

**Follow-up:**
> "Do you know what kind of shingles they used? Sometimes I can tell from looking, but if you have any paperwork from the install, that would be helpful."

### If They Don't Know the Roof Age
> "No worries—most homeowners don't know off the top of their head. Do you know when you bought the house? Was the roof new then, or was it already on the property?"

**Alternative:**
> "Here's a trick: check your closing documents or home inspection report. It usually lists the roof age at the time of sale. I can also tell a lot just from looking at it."

## History Questions

### Previous Work
> "Has any work been done on the roof since you've lived here? Repairs, patches, anything like that?"

**If yes:**
> "What was the issue? Who did the work? Were you happy with how it was handled?"

**If no:**
> "That's actually good news—means it's probably been holding up well. Any close calls, like leaks after big storms?"

### Leak History
> "Have you ever had any leaks or water stains on your ceilings?"

**If yes:**
> "Where were they? Was it fixed, or is it still happening?"

**If no:**
> "That's great. Sometimes damage builds up without visible leaks—until it's too late. That's why inspections like this are so important."

### Storm History
> "Do you remember if your roof was affected by any major storms—specifically hail or high winds?"

**If yes:**
> "Did you file a claim at the time? What happened?"

**If no:**
> "We've had several significant storms in this area recently. That's actually one of the reasons I'm out here—checking for damage people might not have noticed."

## Manufacturer & Warranty Questions

> "Do you happen to know the shingle brand? Owens Corning, GAF, CertainTeed?"

**If they don't know:**
> "I'll be able to tell when I get up there. It matters because warranties vary a lot. Some manufacturers cover the shingles for 30 years, but the contractor's workmanship warranty might only be 2 years—if they even offer one."

> "Do you have any warranty paperwork from the original installation?"

## Red Flags to Listen For
- 🚩 "We've had it patched a few times" → likely at end of life
- 🚩 "We had a leak but never really fixed the source" → damage likely spreading
- 🚩 "The previous owner handled all that" → might not have been done right
- 🚩 "We've been meaning to get it looked at for years" → overdue

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
| Warranty documentation? | |

## Transitioning to the Inspection
> "Based on what you've told me, I definitely want to take a closer look. A [X]-year-old [SHINGLE TYPE] roof with [HISTORY NOTES] is something we should document carefully. I'll take photos of everything and then we can review it together. Sound good?"

## Pro Tips
- If the roof is 15+ years old with no recent inspection, lead with urgency
- If they've had previous repairs, ask to see the work if accessible
- If storm damage was never claimed, it might still be claimable (check deadlines)
- Always verify what they tell you with what you see on the roof`,
      stage: "new",
      scenario: "roof assessment",
      tags: ["discovery", "roof-age", "history", "inspection"],
      isPublished: true,
    },

    // =========================================================================
    // COLD CALLING (1)
    // =========================================================================
    {
      title: "Cold Call Introduction Script",
      description: "Opening, qualifying, and appointment setting for cold outbound calls",
      category: "cold-call",
      type: "script",
      content: `# Cold Call Introduction Script

## Mindset Before Calling
- You're offering value, not begging for time
- They might need you—they just don't know it yet
- Your job is to get the appointment, not close the deal
- Rejection isn't personal; it's part of the process

## Pre-Call Preparation
- [ ] Have the homeowner's name (if possible)
- [ ] Know the property address
- [ ] Check weather history for their area
- [ ] Have your calendar open for scheduling

## The Opening (First 10 Seconds)

**Goal:** Interrupt the pattern, create curiosity, avoid sounding like a telemarketer.

> "Hi, is this [HOMEOWNER NAME]? [Wait for confirmation]

> "Hey [NAME], this is [YOUR NAME] with Guardian Roofing & Siding. I'm calling because we've been working in [THEIR NEIGHBORHOOD/AREA] this week, and I wanted to give you a quick heads up about something. Do you have 30 seconds?"

*If they say yes, continue. If they say no, offer to call back at a specific time.*

## The Hook (Next 20 Seconds)

**Weather-Based Hook:**
> "We've been checking homes in [CITY/ZIP CODE] after the [DATE] storm. There was [hail/wind] reported in your area, and a lot of homeowners don't realize they might have damage that's covered by insurance. Have you had a chance to have your roof inspected?"

**Age-Based Hook:**
> "We've been helping homeowners in [NEIGHBORHOOD] who have roofs that are getting close to the end of their lifespan. I saw that your home was built in [YEAR], which means your roof could be [AGE]. Have you had anyone take a look at it recently?"

**Referral Hook:**
> "I'm actually calling because we just finished a project for your neighbor at [ADDRESS], and they mentioned you might be worth reaching out to. Have you had any concerns about your roof?"

## Qualifying Questions

Once they're engaged, qualify quickly:

1. "How old is your roof, if you know?"
2. "Have you noticed any leaks or missing shingles?"
3. "Who's your homeowner's insurance through?"
4. "Is this a good time for you, or is there a better time for a quick inspection?"

## Setting the Appointment

**Trial Close:**
> "Here's what I'd suggest: I can swing by for a free 15-minute inspection. I'll get on the roof, take photos of any damage, and give you a straight answer—no obligation. If there's nothing wrong, you'll have peace of mind. If there IS damage, you'll want to know before the next storm. Does that make sense?"

**The Ask:**
> "I've got availability [DAY] in the [MORNING/AFTERNOON], or [ALTERNATIVE DAY]. Which works better for you?"

## Handling Objections on the Phone

### "I'm not interested."
> "I totally get it—nobody likes unexpected calls. Quick question though: if your roof DID have storm damage and your insurance would pay for a new one, would you at least want to know? That's all I'm offering—free information."

### "We already had someone look."
> "Great! Who did you use? [Listen] Did they check your insurance eligibility? We've found that a lot of initial assessments miss things that could be covered. Would you be open to a second opinion—no charge?"

### "How did you get my number?"
> "Fair question. We use public records and neighborhood data—nothing shady. I'm reaching out specifically because [REASON: weather event, home age, etc.]. If this isn't relevant to you, I totally understand."

### "I'm renting / I don't own the home."
> "No problem—do you happen to know the owner's name or how to reach them? I'd love to make sure they know about potential damage."

## Ending the Call

**If they booked an appointment:**
> "Perfect, I've got you down for [DATE/TIME]. I'll send you a text to confirm. If anything comes up, just reply to that text. I'll see you [DAY]!"

**If they didn't book but were polite:**
> "No worries at all. I'll send you my info by text in case you change your mind. If you have any questions or notice anything with your roof, give me a call. Thanks for your time, [NAME]."

**If they were firm no:**
> "Understood. Have a great day!"

## Call Cadence & Follow-Up

| Attempt | Timing | Action |
|---------|--------|--------|
| 1 | Day 1 | Initial call |
| 2 | Day 3 | Second call (different time of day) |
| 3 | Day 5 | Voicemail + text |
| 4 | Day 10 | Final attempt |

## Voicemail Script
> "Hi [NAME], this is [YOUR NAME] with Guardian Roofing. I'm calling about storm activity in your area—specifically the [DATE] storm that caused damage to several homes near you. I'm offering free inspections this week, and I'd love to help you check if your roof was affected. Give me a call back at [NUMBER]. Again, that's [YOUR NAME] with Guardian Roofing—[NUMBER]. Thanks!"

## Pro Tips
- Stand while you call—it improves your energy and tone
- Smile—it actually comes through on the phone
- Track your numbers: dials, connects, appointments
- Best times to call: 10-11 AM and 4-6 PM (Tues-Thurs)
- Avoid Mondays (people are catching up) and Fridays (checked out)`,
      stage: "new",
      scenario: "cold outreach",
      tags: JSON.stringify(["cold-call", "phone", "outbound", "appointment-setting"]),
      isPublished: true,
    },

    // =========================================================================
    // FOLLOW-UP (2)
    // =========================================================================
    {
      title: "Post-Inspection Follow-Up Cadence",
      description: "3-5-7 day follow-up schedule with scripts for nurturing undecided prospects",
      category: "follow-up",
      type: "guide",
      content: `# Post-Inspection Follow-Up Cadence

## Why Follow-Up Matters
- 80% of sales require 5+ follow-ups, but most reps stop after 1-2
- The first person to follow up often wins the deal
- Consistent follow-up shows professionalism and commitment

## Follow-Up Timeline

### Day 1: Same-Day Follow-Up (Required)

**Within 2 hours of leaving the inspection:**

**Text Message:**
> "Hi [NAME], it was great meeting you today! Attached are the photos from your roof inspection. As we discussed, there's [SUMMARY OF FINDINGS]. I'll give you a call [TOMORROW/IN A COUPLE DAYS] to go over next steps. In the meantime, feel free to text me with any questions. —[YOUR NAME], Guardian Roofing"

**Email (if you have it):**
> Subject: Your Roof Inspection Report — [ADDRESS]
>
> Hi [NAME],
>
> Thanks again for your time today. Here's a summary of what I found during my inspection:
>
> [BULLET POINTS WITH KEY FINDINGS]
>
> Based on this, I recommend [RECOMMENDATION]. If you'd like to proceed, I can have a crew available as early as [DATE].
>
> Let me know if you have any questions. I'll check in soon.
>
> Best,
> [YOUR NAME]

---

### Day 3: Check-In Call

**Call Script:**
> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. I'm just calling to check in—did you have a chance to look over the inspection report I sent? [Wait for response]

> [IF YES] "Great, what questions came up?"
> [IF NO] "No worries—I know it's a lot to process. The main takeaway is [ONE KEY POINT]. Is now a good time to discuss, or should I call back later?"

**If no answer, leave voicemail:**
> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. Just wanted to follow up on your roof inspection from [DAY]. I know you've got a lot going on, so I'll keep this brief. If you have any questions about the report or want to move forward, give me a call at [NUMBER]. Talk soon!"

---

### Day 5: Value-Add Touch

**Send a helpful resource by text or email:**
> "Hi [NAME], just came across this article about [RELEVANT TOPIC: storm damage claims / roof lifespan / insurance tips]. Thought you might find it useful as you're thinking things through. [LINK]

> No pressure—just wanted to share. I'm here when you're ready to move forward. —[YOUR NAME]"

**Or share a neighborhood update:**
> "Hey [NAME], quick update—we just signed three more jobs on your street this week. Lots of damage from that [DATE] storm. Let me know if you want to revisit your options. —[YOUR NAME]"

---

### Day 7: The "Last Check-In" Call

**Call Script:**
> "Hi [NAME], it's [YOUR NAME] from Guardian. I just wanted to check in one more time before I move on to other projects. Is this still something you're considering, or should I hold off for now?"

**If interested but not ready:**
> "No problem. When do you think would be a better time to revisit this? I'll make a note to reach out then."

**If no longer interested:**
> "I appreciate you letting me know. If anything changes down the line—another storm, a leak, anything—give me a call. I'll keep your info on file. Take care!"

---

### Day 14+: Long-Term Nurture

For prospects who went cold but didn't say "no":
- Add to monthly newsletter / email list
- Send occasional storm alerts for their area
- Reach out again after any major weather event
- Follow up before busy seasons (spring, fall)

## Tracking Your Follow-Ups

| Customer | Inspection Date | Day 1 | Day 3 | Day 5 | Day 7 | Notes |
|----------|-----------------|-------|-------|-------|-------|-------|
| | | | | | | |

## Pro Tips
- Never "just check in"—always provide value or a reason for the call
- Text > email for response rates
- Personalize every message—no copy/paste (they can tell)
- Document what they said in each interaction for the next call
- Don't be afraid to ask: "Is this still a priority for you?"

## Common Mistakes to Avoid
❌ Following up too often (seems desperate)
❌ Waiting too long (they forget you)
❌ Sending identical messages every time
❌ Giving up after one or two attempts`,
      stage: "contacted",
      scenario: "undecided prospect",
      tags: ["follow-up", "nurture", "cadence", "touchpoints"],
      isPublished: true,
    },
    {
      title: "Lost Deal Win-Back Playbook",
      description: "Re-engagement strategies after a prospect chooses a competitor",
      category: "follow-up",
      type: "script",
      content: `# Lost Deal Win-Back Playbook

## When to Use This
- Prospect told you they went with another contractor
- You were ghosted after proposal stage
- The job was postponed indefinitely
- They chose a lower-priced competitor

## Mindset Reset
Losing a deal is not the end—it's the beginning of a new opportunity. Research shows:
- 25% of "lost" deals become available again within 6 months
- Bad contractor experiences are common; you're the backup plan
- Staying professional keeps the door open for referrals

## Immediate Response (When They Tell You No)

**If they chose a competitor:**
> "I appreciate you letting me know—that's more than most people do. May I ask what made the difference? Price, timing, or something else?

> [Listen without being defensive]

> "That makes sense. If for any reason things don't work out, or if you have questions during the process, don't hesitate to reach out. I'm happy to help. Good luck with the project."

**If they're postponing:**
> "Totally understand. Things come up. When do you think would be a better time to revisit this? I'll make a note to follow up then."

## The 30-Day Check-In

Wait 30 days from when they told you no. Then call:

> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. I hope I'm not catching you at a bad time. I just wanted to check in—how did the roof project go? [Wait for response]

**If it went well:**
> "That's great to hear. Glad it worked out. If you ever need anything down the line—maintenance, repairs, or a second opinion—don't hesitate to call. Take care!"

**If there were problems:**
> "That's frustrating. What happened? [Listen] I'm sorry to hear that. If you need help sorting it out—or if you want a second opinion—I'm happy to take a look. No charge, just trying to help."

**If work hasn't started:**
> "Oh interesting. Any reason for the delay? [Listen] I see. Well, if you'd like to revisit your options, I'm here. My schedule is filling up for [SEASON], but I can still fit you in."

## The "Problem Callback" Script

If they contact YOU about issues with their current contractor:

> "Hi [NAME], thanks for calling. What's going on?

> [Listen carefully and take notes]

> "That's frustrating—I'm sorry you're dealing with that. Here's what I can do: I'll come take a look at what's been done so far, document the issues, and give you options. Sometimes we can salvage the work; sometimes it's better to start fresh. There's no charge for me to look. When works for you?"

## The Seasonal Outreach

Reach out strategically before busy seasons or after major weather:

**Spring:**
> "Hi [NAME], it's [YOUR NAME] from Guardian. With storm season starting, I wanted to check in and see if you ever got that roof taken care of. If not, I'm happy to help. Let me know!"

**After a Storm:**
> "Hi [NAME], I hope you and your family are safe after last night's storm. I know we talked about your roof a while back—just wanted to offer a free inspection if you want to make sure everything's okay. No pressure. —[YOUR NAME]"

**Before Winter:**
> "Hi [NAME], just a quick note as we head into winter. If your roof never got addressed, now's the time before the cold sets in. I've got a few openings left this season. Let me know if you'd like to revisit."

## Tracking Lost Deals

Keep a "Lost Deal" list and review it monthly:

| Name | Address | Date Lost | Reason | Follow-Up Date | Notes |
|------|---------|-----------|--------|----------------|-------|
| | | | | | |

## Win-Back Success Stories to Reference

When re-engaging, stories are powerful:
> "Actually, I had a customer last month who went with another company initially. Their contractor ghosted them after the deposit. We stepped in, finished the job properly, and they're now one of our biggest referral sources. Things happen—I'm just glad they called back."

## Pro Tips
- Never badmouth the competitor—it makes you look petty
- Position yourself as the helpful fallback, not the desperate salesperson
- Keep all lost deals in your CRM with follow-up reminders
- The worst they can say is "no" again—which is where you already are`,
      stage: "closed",
      scenario: "lost deal",
      tags: JSON.stringify(["win-back", "lost-deal", "re-engage", "follow-up"]),
      isPublished: true,
    },

    // =========================================================================
    // RETENTION (1)
    // =========================================================================
    {
      title: "Annual Maintenance Upsell Script",
      description: "Script for reaching out to existing customers about maintenance programs",
      category: "retention",
      type: "script",
      content: `# Annual Maintenance Upsell Script

## Purpose
- Generate recurring revenue
- Catch small issues before they become big problems
- Stay top-of-mind for referrals
- Build long-term customer relationships

## Who to Target
- Customers whose roof is 1+ year post-installation
- Customers with older roofs (15+ years) who haven't signed up yet
- Customers in storm-prone areas
- Any customer who's been happy with previous work

## The Outreach Call

**Opening:**
> "Hi [NAME], it's [YOUR NAME] from Guardian Roofing. How are you doing? [Brief chat]

> "I'm actually calling because it's been about [TIME] since we completed your roof, and I wanted to check in. How's everything holding up?"

**If everything is fine:**
> "That's great to hear! Listen, the reason I'm calling is that we've launched an annual maintenance program, and I wanted to offer it to our best customers first—like you."

**Introduce the Program:**
> "Here's how it works: Once a year, we send a technician to your home for a full roof inspection. We check for any wear and tear, clear debris from gutters and valleys, look for lifted shingles or sealant issues, and give you a full report. It's like a health checkup for your roof.

> "If we find anything minor, we take care of it on the spot—no extra charge. If there's something bigger, we'll let you know and give you options. Either way, you'll have peace of mind knowing your roof is in top shape."

**Pricing:**
> "The program is [PRICE] per year—that's less than [$/MONTH] for complete peace of mind. Plus, members get priority scheduling, which is huge during storm season when everyone's calling at once."

## Handling Objections

### "I don't think I need that."
> "I hear you—your roof is in great shape right now. The thing is, small issues can build up without you noticing. We've found loose nails, cracked sealant, and clogged vents during routine checks that would've caused leaks if we hadn't caught them. It's way cheaper to maintain than to repair."

### "That sounds expensive."
> "I understand. Let me put it in perspective: a typical roof repair runs $300-$1,500. The maintenance program is [PRICE] for the whole year, and it often prevents those repairs entirely. It's insurance for your insurance, if you will."

### "I can just call you if there's a problem."
> "Absolutely, and we'll always be here for you. The challenge is that most roof problems don't show up until there's a leak—by then, you've got water damage, maybe mold, and a bigger bill. The maintenance visits catch issues while they're still just maintenance, not repairs."

### "Can I think about it?"
> "Of course. Tell you what—let me email you the details so you have everything in writing. I'll check back in a week. If it's not the right fit, no hard feelings."

## The Close

> "So, [NAME], can I get you set up? We're scheduling our next round of maintenance visits for [MONTH]. I can put you on the calendar now—we can always adjust the date if needed."

**If yes:**
> "Perfect. I just need to confirm your address and the best phone number to reach you. [Collect info] You'll get a confirmation email today, and a reminder call the week before your visit. Any questions?"

**If not yet:**
> "No problem at all. I'll send you the details and follow up next week. In the meantime, if you notice anything with the roof, don't hesitate to reach out."

## Upsell Opportunities During Maintenance Visits

During the visit, look for:
- Gutter guards (if they have debris problems)
- Attic ventilation improvements
- Skylight maintenance
- Siding/fascia touch-ups
- Solar panel considerations (partner referral)

## Follow-Up After Maintenance Visit

**Same-day text:**
> "Hi [NAME], thanks for having us out today! Everything looks [great / good with a few minor fixes we took care of]. Here's your inspection report: [LINK]. Let me know if you have any questions!"

**Referral ask (1 week later):**
> "Hi [NAME], glad your roof is in great shape! Quick favor—if you know anyone who might benefit from a roof inspection or maintenance program, I'd appreciate the referral. We offer [REFERRAL INCENTIVE] for every new customer you send our way. Thanks!"

## Pro Tips
- Schedule maintenance calls for slow seasons (late winter, early summer)
- Use before/after photos from inspections in marketing
- Automate reminders for annual renewals
- Track which customers refer others and give them VIP treatment`,
      stage: "closed",
      scenario: "existing customer",
      tags: JSON.stringify(["retention", "maintenance", "upsell", "recurring"]),
      isPublished: true,
    },

    // =========================================================================
    // PRESENTATION (1)
    // =========================================================================
    {
      title: "In-Home Proposal Presentation",
      description: "Step-by-step guide for presenting proposals and closing in the home",
      category: "presentation",
      type: "guide",
      content: `# In-Home Proposal Presentation

## Pre-Presentation Checklist
- [ ] Confirm all decision-makers will be present
- [ ] Proposal is printed AND available digitally
- [ ] Tablet/laptop charged with inspection photos ready
- [ ] Sample shingle or material samples (if discussing options)
- [ ] Financing application ready (if applicable)
- [ ] Contract ready for signature

## Setting the Stage (First 5 Minutes)

**Arrival:**
> "Thanks for having me back, [NAME]. Is [SPOUSE NAME] joining us? Great. Mind if we sit at the kitchen table? I've got some things to show you."

**Set expectations:**
> "So here's what we're going to cover: First, I'll walk you through the inspection findings. Then we'll look at the proposal—materials, timeline, and investment. Finally, if you have any questions or concerns, we'll address those together. Sound good?"

## Reviewing the Inspection (5-10 Minutes)

**Share photos on tablet or laptop:**
> "These are the photos I took during my inspection. Let me walk you through what I found."

**Point out specific issues:**
- "See this area? That's where the shingles are cupping—a sign of age and weathering."
- "This is hail damage—notice the circular impact marks with missing granules."
- "Here's the flashing around your chimney—it's pulling away, which is a leak waiting to happen."

**Tie to their concerns:**
> "You mentioned noticing a water stain in the guest room. Here's the likely source—right above that spot on the roof."

## Presenting the Proposal (5-10 Minutes)

**Overview first, details second:**
> "Okay, here's the proposal. Let me hit the highlights, and then we can dig into any questions.

> "The total investment for a full roof replacement is [AMOUNT]. That includes tear-off, new underlayment, [SHINGLE TYPE], new flashing, new vents, and a 10-year workmanship warranty on top of the manufacturer's warranty.

> "We're looking at a [X]-day installation window, and I can have you on the schedule for [DATE]."

**Insurance customers:**
> "Now, your insurance approved [AMOUNT]. Your deductible is [AMOUNT]. So your out-of-pocket is just the deductible—[AMOUNT]. The rest is covered."

## Material Options (If Applicable)

> "You have a couple of choices on materials. Here's how they compare:

| Option | Cost | Warranty | Best For |
|--------|------|----------|----------|
| [BASIC] | [PRICE] | [YEARS] | Budget-conscious |
| [STANDARD] | [PRICE] | [YEARS] | Best value |
| [PREMIUM] | [PRICE] | [YEARS] | Long-term investment |

> "Honestly, [OPTION] is what I'd recommend for your situation because [REASON]."

## Addressing Concerns

**Pause and invite questions:**
> "That's the overview. What questions do you have so far?"

**Common concerns to anticipate:**
- **Timeline:** "Can you start sooner?" / "That's too soon."
- **Noise/disruption:** "What about my pets/kids/WFH situation?"
- **Cleanup:** "What do you do with the old materials?"
- **Neighbors:** "Will this affect my neighbors?"

**Always validate before answering:**
> "That's a great question. Here's how we handle that..."

## The Close

**Don't rush it. Take a breath, then:**

> "So, [NAME] and [SPOUSE], based on everything we've discussed—does this look like the right solution for your home?"

**If they say yes or seem ready:**
> "Great. Let me grab the contract. [Pull it out] I just need your signature here, and we'll get you on the schedule."

**If they hesitate:**
> "What's giving you pause? Let's talk through it."

**If they need to discuss privately:**
> "Of course—I'll step outside for a few minutes. Take your time."

## After They Sign

> "Congratulations—you made a great decision. Here's what happens next:

> 1. Materials will be ordered today.
> 2. Our project manager, [NAME], will call you [X] days before the install.
> 3. On installation day, the crew arrives around 7-8 AM. They'll protect your landscaping and vehicles.
> 4. Once we're done, I'll do a final walkthrough with you and make sure you're 100% satisfied.

> "Any questions? Great. I'll be in touch. Thanks again."

## If They Don't Close Today

> "I understand—it's a big decision. When do you think you'll be ready to decide? I'll follow up then."

**Before leaving:**
- Leave a printed proposal
- Leave your card
- Confirm next follow-up date

## Pro Tips
- Don't read the proposal aloud—summarize and let them review
- Watch their body language; adjust if they seem overwhelmed
- Use silence strategically; let them process
- Never leave without a clear next step`,
      stage: "proposal",
      scenario: "in-home meeting",
      tags: JSON.stringify(["presentation", "proposal", "in-home", "closing"]),
      isPublished: true,
    },
    {
      title: "Price Objection Handler",
      description: "Scripts for handling pricing concerns from homeowners",
      category: "objection-handling",
      type: "script",
      content: `# Handling Price Objections

## "Your price is too high"
"I understand price is important. Let me show you what's included in our quote that you might not see from other contractors..."

## Value Points to Emphasize
- Quality materials with manufacturer warranty
- Licensed, bonded, and insured crew
- Post-installation inspection and warranty
- Insurance claim assistance included

## Reframe the Conversation
"Would you rather pay a bit more now, or potentially pay twice when a cheaper job fails in 5 years?"`,
      stage: "negotiation",
      scenario: "budget concerns",
      isPublished: true,
    },
    {
      title: "Hail Damage Assessment Checklist",
      description: "Step-by-step roof inspection for hail damage",
      category: "discovery",
      type: "checklist",
      content: `# Hail Damage Roof Inspection

## Exterior Check
- [ ] Check gutters for granule buildup
- [ ] Inspect downspouts for dents
- [ ] Look for dents on AC units and vents
- [ ] Check siding for impact marks

## Roof Surface
- [ ] Document shingle bruising (soft spots)
- [ ] Note missing granules (circular patterns)
- [ ] Check for cracked shingles
- [ ] Photograph all damage with ruler for scale

## Metal Components
- [ ] Inspect flashing around chimneys
- [ ] Check roof vents for dents
- [ ] Examine ridge caps

## Documentation
- [ ] Take wide shots showing roof coverage
- [ ] Close-up photos of each damage point
- [ ] Note storm date and time`,
      stage: "new",
      scenario: "storm-lead",
      isPublished: true,
    },
    {
      title: "Competitor Win-Back Strategy",
      description: "Recapturing leads lost to competitors",
      category: "objection-handling",
      type: "guide",
      content: `# Competitor Win-Back

## Timing
- Wait 2-4 weeks after they chose competitor
- Check if work has started

## Opening Approach
"Hi [Name], I wanted to follow up. Have you had your roof work done yet?"

## If Not Started
"Sometimes things don't work out as planned. We're still here if you need us."

## If Started (Issues)
Listen for complaints about:
- Crew not showing up
- Poor communication
- Quality concerns

Offer: "We can provide a second opinion if you'd like."`,
      stage: "new",
      isPublished: true,
    },
    {
      title: "30-Day Follow-up Call",
      description: "Post-installation satisfaction check",
      category: "follow-up",
      type: "script",
      content: `# 30-Day Customer Check-In

## Opening
"Hi [Name], this is [Your Name] from Guardian. We completed your roof about a month ago, and I wanted to check in to make sure everything is looking great."

## Key Questions
1. "Have you noticed any issues with the new roof?"
2. "Did our crew leave the property clean?"
3. "Do you have any questions about your warranty?"

## Referral Ask
"We're glad you're happy! Would you happen to know any neighbors or friends who might need roofing work? We offer a referral bonus..."

## Close
"Thank you for choosing Guardian. Don't hesitate to call if you ever have questions!"`,
      stage: "closed",
      isPublished: true,
    },
    {
      title: "Cold Call Script - Storm Season",
      description: "Outbound calling script for storm season",
      category: "discovery",
      type: "script",
      content: `# Storm Season Cold Call

## Introduction
"Hi, this is [Name] from Guardian Roofing. I'm reaching out to homeowners in [Area] because storm season is approaching."

## Value Proposition
"We're offering free pre-storm roof inspections to help identify any weak points before the next big storm hits."

## Overcome Objections
- "My roof is fine" → "Great! An inspection confirms that and gives you peace of mind."
- "I'm not interested" → "I understand. Would it be okay to send you our storm prep checklist by email?"

## Close
"We have openings [Day]. Would morning or afternoon work better for a quick 20-minute inspection?"`,
      stage: "new",
      isPublished: true,
    },
    {
      title: "Roof Material Options Presentation",
      description: "Presenting different roofing material choices",
      category: "presentation",
      type: "template",
      content: `# Roofing Material Options

## 3-Tab Shingles
- **Lifespan:** 15-20 years
- **Cost:** Budget-friendly
- **Best For:** Basic protection, rental properties

## Architectural Shingles
- **Lifespan:** 25-30 years
- **Cost:** Mid-range
- **Best For:** Most homeowners, better aesthetics

## Metal Roofing
- **Lifespan:** 40-70 years
- **Cost:** Premium
- **Best For:** Long-term investment, energy savings

## Recommendation Guide
Based on your [property type], budget of [amount], and plans to stay [X years], I'd recommend...`,
      stage: "proposal",
      isPublished: true,
    },
    {
      title: "Insurance Adjuster Meeting Prep",
      description: "Preparing for the insurance adjuster visit",
      category: "closing",
      type: "checklist",
      content: `# Adjuster Meeting Preparation

## Before the Meeting
- [ ] Review your damage documentation
- [ ] Have your contractor's estimate ready
- [ ] Know your policy deductible
- [ ] Prepare a list of all damage areas

## During the Meeting
- [ ] Walk the adjuster through each damage point
- [ ] Point out any items they might miss
- [ ] Take notes on what they document
- [ ] Ask questions about timeline and next steps

## After the Meeting
- [ ] Request a copy of their report
- [ ] Compare their assessment to contractor estimate
- [ ] Follow up within 48 hours if discrepancies`,
      stage: "proposal",
      isPublished: true,
    },
    {
      title: "Emergency Tarp Protocol",
      description: "Emergency response for active roof leaks",
      category: "follow-up",
      type: "checklist",
      content: `# Emergency Tarp Response

## Initial Assessment
- [ ] Confirm leak location inside home
- [ ] Check weather conditions (safety first)
- [ ] Take photos before tarping

## Tarp Installation
- [ ] Use proper 6mil or thicker tarp
- [ ] Extend tarp 4ft past damage on all sides
- [ ] Secure with 2x4 boards, not just sandbags
- [ ] Ensure water runoff path is clear

## Documentation
- [ ] Before and after photos
- [ ] Note time and date
- [ ] Document emergency response for insurance`,
      stage: "new",
      isPublished: true,
    },
    {
      title: "Warranty Explanation Guide",
      description: "Explaining roofing warranties to customers",
      category: "presentation",
      type: "guide",
      content: `# Understanding Roofing Warranties

## Manufacturer Warranty
- Covers defects in roofing materials
- Typically 20-50 years depending on product
- May be prorated after certain period
- Requires proper installation by certified contractor

## Workmanship Warranty
- Covers installation errors
- Guardian offers 10-year workmanship warranty
- Covers leaks due to improper installation
- Does not cover storm damage

## What's NOT Covered
- Normal wear and tear
- Damage from foot traffic
- Acts of nature (storms, hail, wind)
- Lack of maintenance`,
      stage: "proposal",
      isPublished: true,
    },
    {
      title: "Referral Request Script",
      description: "Asking for referrals from satisfied customers",
      category: "closing",
      type: "script",
      content: `# Referral Request Approach

## Best Timing
Ask for referrals when customers are happiest:
- Right after installation completion
- After positive follow-up call
- After warranty claim resolved

## The Ask
"We're so glad you're happy with your new roof! We grow our business through happy customers like you. Do you know anyone—neighbors, family, coworkers—who might need roofing work?"

## Incentive Mention
"As a thank you, we offer a $250 referral bonus when your referral becomes a customer."

## Follow Up
"Would it be okay if I checked back in a few weeks? Sometimes people remember someone after thinking about it."`,
      stage: "closed",
      isPublished: true,
    },
    {
      title: "Homeowner Objection: Already Have a Roofer",
      description: "Handling the 'I already have someone' objection",
      category: "objection-handling",
      type: "script",
      content: `# "I Already Have a Roofer"

## Acknowledge Their Position
"That's great that you have someone you trust. May I ask who you're working with?"

## Find the Gap
"Have they helped with insurance claims before? That's actually our specialty."

## Offer Value-Add
"Even if you use your regular roofer, we're happy to provide a free second opinion on the damage assessment—especially for insurance purposes."

## Leave the Door Open
"If anything changes or you'd like another perspective, please keep my card. We're here to help."`,
      stage: "new",
      isPublished: true,
    },
    {
      title: "Supplement Filing Guide",
      description: "Filing supplements when insurance underpays",
      category: "closing",
      type: "guide",
      content: `# Insurance Supplement Process

## When to File
- Initial payout doesn't cover repair costs
- Hidden damage discovered during work
- Adjuster missed damage items

## Required Documentation
1. Original estimate and scope
2. Photos of additional damage
3. Contractor's revised estimate
4. Detailed explanation letter

## Filing Steps
1. Gather all new documentation
2. Contact claims adjuster directly
3. Request re-inspection if needed
4. Follow up in writing within 48 hours

## Key Points
- Be specific and factual
- Reference policy language
- Keep all communication records`,
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
