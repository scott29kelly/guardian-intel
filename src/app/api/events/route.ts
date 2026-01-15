/**
 * Server-Sent Events (SSE) Endpoint
 * 
 * GET /api/events - Stream real-time updates for:
 * - Storm alerts (WeatherEvent inserts/updates)
 * - Intel items (IntelItem changes)
 * - Customer updates (Customer changes)
 * 
 * Uses centralized polling to avoid connection pool exhaustion.
 * One timer polls the database and broadcasts to all clients.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Store connected clients for broadcasting
const clients = new Set<ReadableStreamDefaultController>();

// Event types we broadcast
type SSEEventType = "storm" | "intel" | "customer" | "heartbeat" | "connected";

interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

// Centralized polling state
let centralPollInterval: NodeJS.Timeout | null = null;
let lastCheck = new Date();
const encoder = new TextEncoder();

// Broadcast event to all connected clients
function broadcast(event: SSEEvent) {
  const message = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  
  for (const controller of clients) {
    try {
      controller.enqueue(message);
    } catch {
      // Client disconnected, will be cleaned up
      clients.delete(controller);
    }
  }
}

// Start centralized polling (only one instance runs)
function startCentralPolling() {
  if (centralPollInterval) return; // Already running
  
  console.log("[SSE] Starting centralized polling");
  
  centralPollInterval = setInterval(async () => {
    if (clients.size === 0) {
      // No clients, stop polling
      if (centralPollInterval) {
        clearInterval(centralPollInterval);
        centralPollInterval = null;
        console.log("[SSE] No clients, stopping centralized polling");
      }
      return;
    }
    
    try {
      // Single batch of queries for all clients
      const [newWeatherEvents, newIntelItems, updatedCustomers] = await Promise.all([
        prisma.weatherEvent.findMany({
          where: { createdAt: { gt: lastCheck } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.intelItem.findMany({
          where: { createdAt: { gt: lastCheck } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.customer.findMany({
          where: {
            updatedAt: { gt: lastCheck },
            leadScore: { gte: 70 },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),
      ]);
      
      // Broadcast weather events
      for (const event of newWeatherEvents) {
        broadcast({
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
        });
      }
      
      // Broadcast intel items
      for (const intel of newIntelItems) {
        broadcast({
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
        });
      }
      
      // Broadcast customer updates
      for (const customer of updatedCustomers) {
        broadcast({
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
        });
      }
      
      lastCheck = new Date();
    } catch (error) {
      console.error("[SSE] Central poll error:", error);
    }
  }, 10000); // Poll every 10 seconds (was 5s per client)
}

export async function GET(request: NextRequest) {
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
      
      // Start centralized polling if not already running
      startCentralPolling();
      
      // Heartbeat to keep connection alive (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat: SSEEvent = {
            type: "heartbeat",
            data: { ping: true, clients: clients.size },
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          clients.delete(controller);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
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
      "X-Accel-Buffering": "no",
    },
  });
}
