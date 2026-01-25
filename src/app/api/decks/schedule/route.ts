/**
 * POST /api/decks/schedule
 * 
 * Queue a deck generation job for a customer.
 * The worker script will pick this up and process it.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Request validation schema
const scheduleRequestSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  templateId: z.string().default("sales-deck"), // Default template
  templateName: z.string().default("Sales Presentation"),
  assignedToId: z.string().optional(), // For manager bulk scheduling
  scheduledFor: z.string().datetime().optional(), // Schedule for later
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = scheduleRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, templateId, templateName, assignedToId, scheduledFor } = validationResult.data;

    // Fetch customer to validate existence and get data for the deck
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        assignedRep: {
          select: { id: true, name: true, email: true }
        },
        claims: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        weatherEvents: {
          orderBy: { eventDate: "desc" },
          take: 5,
        },
        intelItems: {
          where: { isDismissed: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check for existing pending/processing deck for this customer
    const existingJob = await prisma.scheduledDeck.findFirst({
      where: {
        customerId,
        status: { in: ["pending", "processing"] },
      },
    });

    if (existingJob) {
      return NextResponse.json(
        { 
          error: "A deck is already being generated for this customer",
          existingJobId: existingJob.id,
          status: existingJob.status,
        },
        { status: 409 } // Conflict
      );
    }

    // Build the request payload with all customer context
    const requestPayload = {
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          county: customer.county,
        },
        property: {
          type: customer.propertyType,
          yearBuilt: customer.yearBuilt,
          squareFootage: customer.squareFootage,
          lotSize: customer.lotSize,
          stories: customer.stories,
          bedrooms: customer.bedrooms,
          bathrooms: customer.bathrooms,
          value: customer.propertyValue,
        },
        roof: {
          type: customer.roofType,
          age: customer.roofAge,
          squares: customer.roofSquares,
          pitch: customer.roofPitch,
          condition: customer.roofCondition,
          lastWork: customer.lastRoofWork,
        },
        insurance: {
          carrier: customer.insuranceCarrier,
          policyNumber: customer.policyNumber,
          policyType: customer.policyType,
          deductible: customer.deductible,
          claimHistory: customer.claimHistory,
        },
        scores: {
          lead: customer.leadScore,
          urgency: customer.urgencyScore,
          profitPotential: customer.profitPotential,
          churnRisk: customer.churnRisk,
          engagement: customer.engagementScore,
        },
        pipeline: {
          status: customer.status,
          stage: customer.stage,
          leadSource: customer.leadSource,
          estimatedJobValue: customer.estimatedJobValue,
        },
        assignedRep: customer.assignedRep,
      },
      recentClaims: customer.claims.map(claim => ({
        id: claim.id,
        carrier: claim.carrier,
        dateOfLoss: claim.dateOfLoss,
        claimType: claim.claimType,
        status: claim.status,
        approvedValue: claim.approvedValue,
      })),
      weatherEvents: customer.weatherEvents.map(event => ({
        id: event.id,
        type: event.eventType,
        date: event.eventDate,
        severity: event.severity,
        hailSize: event.hailSize,
        windSpeed: event.windSpeed,
      })),
      intelItems: customer.intelItems.map(item => ({
        id: item.id,
        category: item.category,
        title: item.title,
        content: item.content,
        priority: item.priority,
        confidence: item.confidence,
      })),
      generatedAt: new Date().toISOString(),
      templateId,
    };

    // Create the scheduled deck job
    const scheduledDeck = await prisma.scheduledDeck.create({
      data: {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        templateId,
        templateName,
        requestedById: session.user.id,
        assignedToId: assignedToId || customer.assignedRepId || session.user.id,
        status: "pending",
        requestPayload: JSON.stringify(requestPayload),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        estimatedSlides: 8, // Default estimate for sales deck
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: scheduledDeck.id,
        status: scheduledDeck.status,
        customerId: scheduledDeck.customerId,
        customerName: scheduledDeck.customerName,
        templateName: scheduledDeck.templateName,
        scheduledFor: scheduledDeck.scheduledFor,
        createdAt: scheduledDeck.createdAt,
      },
      message: "Deck generation queued successfully",
    });

  } catch (error) {
    console.error("[API] Error scheduling deck:", error);
    return NextResponse.json(
      { error: "Failed to schedule deck generation" },
      { status: 500 }
    );
  }
}

// GET - List scheduled decks for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Filter by status
    const customerId = searchParams.get("customerId"); // Filter by customer
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      OR: [
        { requestedById: session.user.id },
        { assignedToId: session.user.id },
      ],
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const decks = await prisma.scheduledDeck.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        customerId: true,
        customerName: true,
        templateName: true,
        status: true,
        scheduledFor: true,
        completedAt: true,
        createdAt: true,
        errorMessage: true,
        // pdfUrl: true, // Uncomment after migration
      },
    });

    return NextResponse.json({
      decks,
      count: decks.length,
    });

  } catch (error) {
    console.error("[API] Error fetching decks:", error);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    );
  }
}
