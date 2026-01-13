/**
 * Audit Logging Service
 * 
 * Centralized audit logging for tracking user actions, mutations,
 * and security-relevant events throughout the application.
 * 
 * Logged events:
 * - User logins/logouts
 * - Customer stage changes
 * - Bulk actions
 * - Data exports
 * - API key usage
 * - Critical settings changes
 */

import { prisma } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

export type AuditEventType =
  | "login"
  | "logout"
  | "view"
  | "create"
  | "update"
  | "delete"
  | "bulk_action"
  | "export"
  | "import"
  | "stage_change"
  | "assignment"
  | "api_call"
  | "settings_change"
  | "password_change"
  | "permission_change";

export type AuditEntityType =
  | "user"
  | "customer"
  | "lead"
  | "claim"
  | "document"
  | "playbook"
  | "conversation"
  | "settings"
  | "api_key"
  | "bulk_operation";

export interface AuditLogEntry {
  userId: string;
  type: AuditEventType;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  userId?: string;
  type?: AuditEventType;
  entityType?: AuditEntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// AUDIT SERVICE
// ============================================

class AuditService {
  private static instance: AuditService;
  private enabled = true;

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) return;

    try {
      await prisma.activity.create({
        data: {
          userId: entry.userId,
          type: entry.type,
          entityType: entry.entityType,
          entityId: entry.entityId,
          description: entry.description,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      // Don't throw on audit failures - log and continue
      console.error("[Audit] Failed to log event:", error);
    }
  }

  /**
   * Log a user login event
   */
  async logLogin(
    userId: string,
    options?: { ipAddress?: string; userAgent?: string; method?: string }
  ): Promise<void> {
    await this.log({
      userId,
      type: "login",
      entityType: "user",
      entityId: userId,
      description: `User logged in via ${options?.method || "credentials"}`,
      metadata: { method: options?.method },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  /**
   * Log a user logout event
   */
  async logLogout(
    userId: string,
    options?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      type: "logout",
      entityType: "user",
      entityId: userId,
      description: "User logged out",
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  /**
   * Log a customer stage change
   */
  async logStageChange(
    userId: string,
    customerId: string,
    previousStage: string,
    newStage: string,
    customerName?: string
  ): Promise<void> {
    await this.log({
      userId,
      type: "stage_change",
      entityType: "customer",
      entityId: customerId,
      description: `Changed ${customerName || "customer"} from "${previousStage}" to "${newStage}"`,
      metadata: {
        previousStage,
        newStage,
        customerName,
      },
    });
  }

  /**
   * Log a bulk action
   */
  async logBulkAction(
    userId: string,
    action: string,
    entityType: AuditEntityType,
    entityIds: string[],
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      type: "bulk_action",
      entityType,
      description: `Bulk ${action} on ${entityIds.length} ${entityType}(s)`,
      metadata: {
        action,
        count: entityIds.length,
        entityIds: entityIds.slice(0, 100), // Limit stored IDs
        ...details,
      },
    });
  }

  /**
   * Log a customer assignment change
   */
  async logAssignment(
    userId: string,
    customerId: string,
    previousRepId: string | null,
    newRepId: string,
    customerName?: string
  ): Promise<void> {
    await this.log({
      userId,
      type: "assignment",
      entityType: "customer",
      entityId: customerId,
      description: `Assigned ${customerName || "customer"} to rep`,
      metadata: {
        previousRepId,
        newRepId,
        customerName,
      },
    });
  }

  /**
   * Log a data export
   */
  async logExport(
    userId: string,
    entityType: AuditEntityType,
    count: number,
    format: string,
    filters?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      type: "export",
      entityType,
      description: `Exported ${count} ${entityType}(s) as ${format}`,
      metadata: {
        count,
        format,
        filters,
      },
    });
  }

  /**
   * Log a settings change
   */
  async logSettingsChange(
    userId: string,
    setting: string,
    previousValue: unknown,
    newValue: unknown
  ): Promise<void> {
    await this.log({
      userId,
      type: "settings_change",
      entityType: "settings",
      description: `Changed setting "${setting}"`,
      metadata: {
        setting,
        previousValue,
        newValue,
      },
    });
  }

  /**
   * Log a password change
   */
  async logPasswordChange(
    userId: string,
    targetUserId: string,
    options?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      type: "password_change",
      entityType: "user",
      entityId: targetUserId,
      description: userId === targetUserId 
        ? "User changed their password" 
        : "Admin changed user password",
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  /**
   * Log a CRUD operation
   */
  async logCrud(
    userId: string,
    operation: "create" | "update" | "delete",
    entityType: AuditEntityType,
    entityId: string,
    entityName?: string,
    changes?: Record<string, { old: unknown; new: unknown }>
  ): Promise<void> {
    const operationLabels = {
      create: "Created",
      update: "Updated",
      delete: "Deleted",
    };

    await this.log({
      userId,
      type: operation,
      entityType,
      entityId,
      description: `${operationLabels[operation]} ${entityType}: ${entityName || entityId}`,
      metadata: changes ? { changes } : undefined,
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(filter: AuditLogFilter) {
    const where: Record<string, unknown> = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.type) where.type = filter.type;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        (where.createdAt as Record<string, unknown>).gte = filter.startDate;
      }
      if (filter.endDate) {
        (where.createdAt as Record<string, unknown>).lte = filter.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit || 50,
        skip: filter.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      hasMore: (filter.offset || 0) + logs.length < total,
    };
  }

  /**
   * Get recent activity for a specific entity
   */
  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    limit = 20
  ) {
    const logs = await prisma.activity.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    days = 30
  ): Promise<Record<AuditEventType, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.activity.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const summary: Record<string, number> = {};
    activities.forEach((a) => {
      summary[a.type] = a._count;
    });

    return summary as Record<AuditEventType, number>;
  }
}

// Singleton instance
export const auditService = AuditService.getInstance();

// ============================================
// MIDDLEWARE HELPERS
// ============================================

/**
 * Extract client info from request headers
 */
export function getClientInfo(headers: Headers) {
  return {
    ipAddress: 
      headers.get("x-forwarded-for")?.split(",")[0] ||
      headers.get("x-real-ip") ||
      "unknown",
    userAgent: headers.get("user-agent") || undefined,
  };
}

/**
 * Create an audit logger bound to a specific request context
 */
export function createRequestAuditor(
  userId: string,
  headers: Headers
) {
  const clientInfo = getClientInfo(headers);

  return {
    log: (entry: Omit<AuditLogEntry, "userId" | "ipAddress" | "userAgent">) =>
      auditService.log({
        ...entry,
        userId,
        ...clientInfo,
      }),
    logStageChange: (
      customerId: string,
      previousStage: string,
      newStage: string,
      customerName?: string
    ) =>
      auditService.logStageChange(
        userId,
        customerId,
        previousStage,
        newStage,
        customerName
      ),
    logBulkAction: (
      action: string,
      entityType: AuditEntityType,
      entityIds: string[],
      details?: Record<string, unknown>
    ) =>
      auditService.logBulkAction(userId, action, entityType, entityIds, details),
    logCrud: (
      operation: "create" | "update" | "delete",
      entityType: AuditEntityType,
      entityId: string,
      entityName?: string,
      changes?: Record<string, { old: unknown; new: unknown }>
    ) =>
      auditService.logCrud(userId, operation, entityType, entityId, entityName, changes),
  };
}
