/**
 * Server-Sent Events (SSE) Endpoint
 * 
 * GET /api/events - Stream real-time updates for:
 * - Storm alerts (WeatherEvent inserts/updates)
 * - Intel items (IntelItem changes)
 * - Customer updates (Customer changes)
 * 
 * Compatible with Vercel Edge Functions.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Store connected clients for broadcasting
const clients = new Set<ReadableStreamDefaultController>();

// Event types we broadcast (internal to this module)
type SSEEventType = "storm" | "intel" | "customer" | "heartbeat" | "connected";

interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set
      clients.add(controller);
      
      // Send initial connection confirmation
      const connectEvent: SSEEvent = {
        type: "connected",
        data: { message: "Connected to Guardian Intel real-time feed", clientCount: clients.size },
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`));
      
      // Heartbeat to keep connection alive (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat: SSEEvent = {
            type: "heartbeat",
            data: { ping: true },
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          clients.delete(controller);
        }
      }, 30000);
      
      // Poll for new events (check every 5 seconds)
      let lastCheck = new Date();
      const pollInterval = setInterval(async () => {
        try {
          // Check for new weather events
          const newWeatherEvents = await prisma.weatherEvent.findMany({
            where: {
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          
          for (const event of newWeatherEvents) {
            const stormEvent: SSEEvent = {
              type: "storm",
              data: {
                id: event.id,
                eventType: event.eventType,
                severity: event.severity,
                city: event.city,
                state: event.state,
                county: event.county,
                zipCode: event.zipCode,
                hailSize: event.hailSize,
                windSpeed: event.windSpeed,
                eventDate: event.eventDate.toISOString(),
              },
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(stormEvent)}\n\n`));
          }
          
          // Check for new intel items
          const newIntelItems = await prisma.intelItem.findMany({
            where: {
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          
          for (const intel of newIntelItems) {
            const intelEvent: SSEEvent = {
              type: "intel",
              data: {
                id: intel.id,
                customerId: intel.customerId,
                category: intel.category,
                title: intel.title,
                content: intel.content,
                priority: intel.priority,
              },
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(intelEvent)}\n\n`));
          }
          
          // Check for updated customers (high priority changes)
          const updatedCustomers = await prisma.customer.findMany({
            where: {
              updatedAt: { gt: lastCheck },
              leadScore: { gte: 70 }, // Only notify for high-value leads
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          });
          
          for (const customer of updatedCustomers) {
            const customerEvent: SSEEvent = {
              type: "customer",
              data: {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                city: customer.city,
                state: customer.state,
                leadScore: customer.leadScore,
                status: customer.status,
              },
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(customerEvent)}\n\n`));
          }
          
          lastCheck = new Date();
        } catch (error) {
          console.error("[SSE] Poll error:", error);
        }
      }, 5000);
      
      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        clients.delete(controller);
        console.log(`[SSE] Client disconnected. Active clients: ${clients.size}`);
      });
      
      console.log(`[SSE] Client connected. Active clients: ${clients.size}`);
    },
    
    cancel() {
      // Stream cancelled by client
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
