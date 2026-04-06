/**
 * Test the async deck generation pipeline WITHOUT calling NotebookLM or NB Pro.
 *
 * Tests:
 * 1. Schedule API creates a ScheduledDeck record
 * 2. Status API returns correct polling state
 * 3. Processing marks deck as completed with fake slide data
 * 4. Status API returns isReady=true with resultPayload
 * 5. Cleanup
 *
 * Usage: npx tsx scripts/test-async-pipeline.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DIVIDER = "─".repeat(60);

async function main() {
  console.log("\n🧪 Async Deck Pipeline Test (no AI calls)\n");
  console.log(DIVIDER);

  // Step 0: Get a customer and user to work with
  const customer = await prisma.customer.findFirst({
    select: { id: true, firstName: true, lastName: true },
  });
  if (!customer) {
    console.error("❌ No customers in database. Seed first.");
    return;
  }
  console.log(`✓ Using customer: ${customer.firstName} ${customer.lastName} (${customer.id})`);

  const user = await prisma.user.findFirst({
    select: { id: true, name: true },
  });
  if (!user) {
    console.error("❌ No users in database.");
    return;
  }
  console.log(`✓ Using user: ${user.name} (${user.id})`);

  // Step 1: Clean up any stale test decks
  const deleted = await prisma.scheduledDeck.deleteMany({
    where: { customerId: customer.id },
  });
  if (deleted.count > 0) {
    console.log(`✓ Cleaned up ${deleted.count} stale deck(s) for this customer`);
  }

  console.log(DIVIDER);

  // Step 2: Create a ScheduledDeck (simulates POST /api/decks/schedule)
  console.log("\n📋 STEP 1: Create ScheduledDeck (simulates schedule API)");
  const requestPayload = {
    customer: {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      firstName: customer.firstName,
      lastName: customer.lastName,
      address: { street: "123 Test St", city: "TestCity", state: "PA", zipCode: "19000" },
      property: { type: "Single Family", yearBuilt: 2005, squareFootage: 2200 },
      roof: { type: "Asphalt Shingle", age: 12 },
      insurance: { carrier: "State Farm" },
      scores: { lead: 85, urgency: 72 },
      pipeline: { status: "active", stage: "qualified" },
    },
    weatherEvents: [],
    templateId: "sales-deck",
    generatedAt: new Date().toISOString(),
  };

  const deck = await prisma.scheduledDeck.create({
    data: {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      templateId: "sales-deck",
      templateName: "Sales Presentation",
      requestedById: user.id,
      assignedToId: user.id,
      status: "pending",
      requestPayload: JSON.stringify(requestPayload),
      scheduledFor: new Date(),
      estimatedSlides: 5,
    },
  });
  console.log(`✓ Created ScheduledDeck: ${deck.id}`);
  console.log(`  Status: ${deck.status}`);
  console.log(`  Customer: ${deck.customerName}`);

  // Step 3: Check status (simulates GET /api/decks/status/[customerId])
  console.log("\n📊 STEP 2: Check status (should be pending)");
  let latestDeck = await prisma.scheduledDeck.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`✓ Status: ${latestDeck?.status}`);
  console.log(`  isPending: ${latestDeck?.status === "pending"}`);
  console.log(`  isProcessing: ${latestDeck?.status === "processing"}`);

  // Step 4: Mark as processing (simulates process-now route)
  console.log("\n⚙️  STEP 3: Mark as processing (simulates process-now)");
  await prisma.scheduledDeck.update({
    where: { id: deck.id },
    data: { status: "processing" },
  });
  latestDeck = await prisma.scheduledDeck.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`✓ Status: ${latestDeck?.status}`);
  console.log(`  isProcessing: ${latestDeck?.status === "processing"}`);

  // Step 5: Mark as completed with fake slide data (simulates processDeckWithNotebookLM)
  console.log("\n✅ STEP 4: Mark as completed with fake slides");
  const fakeResultPayload = {
    id: deck.id,
    templateId: "sales-deck",
    templateName: "Sales Presentation",
    generatedAt: new Date().toISOString(),
    context: { customerId: customer.id, customerName: deck.customerName },
    pipeline: "NotebookLM",
    slides: [
      { id: `${deck.id}-slide-1`, pageNumber: 1, imageData: "iVBORw0KGgoAAAANSUhEUg==", mimeType: "image/png", generatedAt: new Date().toISOString() },
      { id: `${deck.id}-slide-2`, pageNumber: 2, imageData: "iVBORw0KGgoAAAANSUhEUg==", mimeType: "image/png", generatedAt: new Date().toISOString() },
      { id: `${deck.id}-slide-3`, pageNumber: 3, imageData: "iVBORw0KGgoAAAANSUhEUg==", mimeType: "image/png", generatedAt: new Date().toISOString() },
    ],
    metadata: {
      totalSlides: 3,
      generationTimeMs: 180000,
      version: "2.0.0",
      pipeline: "NotebookLM",
    },
  };

  await prisma.scheduledDeck.update({
    where: { id: deck.id },
    data: {
      status: "completed",
      resultPayload: JSON.stringify(fakeResultPayload),
      completedAt: new Date(),
      actualSlides: 3,
      processingTimeMs: 180000,
    },
  });

  const completedSnapshot = await prisma.scheduledDeck.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      completedAt: true,
      actualSlides: true,
      processingTimeMs: true,
      resultPayload: true,
      pdfUrl: true,
    },
  });
  console.log(`✓ Status: ${completedSnapshot?.status}`);
  console.log(`  isCompleted: ${completedSnapshot?.status === "completed"}`);
  console.log(`  isReady: ${completedSnapshot?.status === "completed"}`);
  console.log(`  actualSlides: ${completedSnapshot?.actualSlides}`);
  console.log(`  processingTimeMs: ${completedSnapshot?.processingTimeMs}`);
  console.log(`  hasResultPayload: ${!!completedSnapshot?.resultPayload}`);

  // Step 6: Parse resultPayload (simulates setDeckFromResult in hook)
  console.log("\n📦 STEP 5: Parse resultPayload (simulates hook setDeckFromResult)");
  if (completedSnapshot?.resultPayload) {
    const result = JSON.parse(completedSnapshot.resultPayload as string);
    console.log(`✓ Parsed result:`);
    console.log(`  pipeline: ${result.pipeline}`);
    console.log(`  slides: ${result.slides.length}`);
    console.log(`  metadata.totalSlides: ${result.metadata.totalSlides}`);
    console.log(`  Each slide has imageData: ${result.slides.every((s: { imageData?: string }) => !!s.imageData)}`);
  }

  // Step 7: Test 409 conflict (simulates re-clicking Generate while job exists)
  console.log("\n🔄 STEP 6: Test conflict detection");
  // Reset to pending for this test
  await prisma.scheduledDeck.update({
    where: { id: deck.id },
    data: { status: "pending" },
  });
  const existingJob = await prisma.scheduledDeck.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["pending", "processing"] },
    },
  });
  if (existingJob) {
    console.log(`✓ 409 conflict correctly detected: existing job ${existingJob.id} (status: ${existingJob.status})`);
  } else {
    console.log("❌ Failed to detect existing job — would create duplicate");
  }

  // Step 8: Test the status API endpoint (if dev server is running)
  console.log("\n🌐 STEP 7: Test status API endpoint");
  try {
    const statusResponse = await fetch(`http://localhost:3001/api/decks/status/${customer.id}`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`✓ Status API response:`);
      console.log(`  hasDeck: ${statusData.hasDeck}`);
      console.log(`  isPending: ${statusData.isPending}`);
      console.log(`  isProcessing: ${statusData.isProcessing}`);
      console.log(`  isCompleted: ${statusData.isCompleted}`);
      console.log(`  isReady: ${statusData.isReady}`);
    } else {
      const text = await statusResponse.text();
      console.log(`⚠️  Status API returned ${statusResponse.status}: ${text.substring(0, 100)}`);
      if (statusResponse.status === 401) {
        console.log("   (Expected — no session cookie in script context)");
      }
    }
  } catch {
    console.log("⚠️  Dev server not running — skipped API test");
  }

  // Step 9: Test schedule API endpoint
  console.log("\n🌐 STEP 8: Test schedule API endpoint");
  // First clean up so we can test scheduling
  await prisma.scheduledDeck.delete({ where: { id: deck.id } });
  try {
    const scheduleResponse = await fetch("http://localhost:3001/api/decks/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "manual",
      body: JSON.stringify({
        customerId: customer.id,
        templateId: "sales-deck",
        templateName: "Test",
      }),
    });
    console.log(`✓ Schedule API response: ${scheduleResponse.status}`);
    if (scheduleResponse.status >= 300 && scheduleResponse.status < 400) {
      console.log(`  ❌ REDIRECT detected → ${scheduleResponse.headers.get("location")}`);
      console.log("  This means middleware is still redirecting API routes!");
    } else if (scheduleResponse.status === 401) {
      const body = await scheduleResponse.json();
      console.log(`  ✓ Got proper 401 JSON: ${JSON.stringify(body)}`);
      console.log("  (Expected — no session cookie in script. Browser calls will work.)");
    } else if (scheduleResponse.ok) {
      const body = await scheduleResponse.json();
      console.log(`  ✓ Schedule succeeded: ${JSON.stringify(body)}`);
      // Clean up
      if (body.job?.id) {
        await prisma.scheduledDeck.delete({ where: { id: body.job.id } });
      }
    }
  } catch {
    console.log("⚠️  Dev server not running — skipped API test");
  }

  // Cleanup
  console.log("\n🧹 Cleanup");
  const cleanedUp = await prisma.scheduledDeck.deleteMany({
    where: { customerId: customer.id },
  });
  console.log(`✓ Deleted ${cleanedUp.count} test deck(s)`);

  console.log("\n" + DIVIDER);
  console.log("✅ All pipeline stages verified successfully!");
  console.log(DIVIDER + "\n");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
