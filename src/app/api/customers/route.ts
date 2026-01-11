/**
 * Customers API
 * 
 * GET /api/customers - List customers with pagination and filtering
 * POST /api/customers - Create a new customer
 * 
 * Security:
 * - Rate limited
 * - Input validated
 * - Authentication required via middleware
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { customerQuerySchema, createCustomerSchema, formatZodErrors } from "@/lib/validations";
import { getCustomers, createCustomer } from "@/lib/data/customers";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers
 * 
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - search: string
 * - status: lead | prospect | customer | closed-won | closed-lost
 * - stage: new | contacted | qualified | proposal | negotiation | closed
 * - state: PA | NJ | DE | MD | VA | NY
 * - sortBy: leadScore | urgencyScore | profitPotential | name | lastContact
 * - sortOrder: asc | desc
 */
export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query
    const validation = customerQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    // Fetch customers
    const result = await getCustomers(validation.data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[API] GET /api/customers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * 
 * Create a new customer
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session for assignedRepId
    const session = await getServerSession(authOptions);
    const assignedRepId = (session?.user as any)?.id;

    // Parse and validate body
    const body = await request.json();
    const validation = createCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    // Create customer
    const customer = await createCustomer(validation.data, assignedRepId);

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/customers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
