/**
 * Base Carrier Adapter
 * 
 * Abstract base class with common functionality for carrier integrations.
 */

import type {
  CarrierAdapter,
  CarrierConfig,
  CarrierResponse,
  CarrierError,
  ClaimSubmission,
  ClaimFilingResult,
  ClaimStatusResult,
  SupplementSubmission,
  SupplementResult,
  DocumentUpload,
  DocumentUploadResult,
  CarrierDocument,
  CarrierWebhookPayload,
  CarrierClaimStatus,
} from "./types";
// import { prisma } from "@/lib/prisma"; // TODO: Re-enable when CarrierSyncLog model exists

export abstract class BaseCarrierAdapter implements CarrierAdapter {
  abstract readonly carrierCode: string;
  abstract readonly carrierName: string;
  
  protected config: CarrierConfig | null = null;
  protected baseUrl: string = "";
  
  // ============================================================
  // Initialization
  // ============================================================
  
  async initialize(config: CarrierConfig): Promise<void> {
    this.config = config;
    this.baseUrl = config.apiEndpoint || this.getDefaultEndpoint();
    
    // Check if token refresh is needed
    if (config.tokenExpiry && new Date(config.tokenExpiry) < new Date()) {
      await this.refreshToken?.();
    }
  }
  
  protected abstract getDefaultEndpoint(): string;
  
  async testConnection(): Promise<boolean> {
    try {
      // Default implementation - can be overridden
      const response = await this.makeRequest("GET", "/health");
      return response.success;
    } catch {
      return false;
    }
  }
  
  async refreshToken(): Promise<void> {
    // Default no-op - override in adapters that use OAuth
  }
  
  // ============================================================
  // Abstract Methods - Must be implemented by carrier adapters
  // ============================================================
  
  abstract fileClaim(claim: ClaimSubmission): Promise<CarrierResponse<ClaimFilingResult>>;
  abstract getClaimStatus(carrierClaimId: string): Promise<CarrierResponse<ClaimStatusResult>>;
  abstract getClaimByNumber(claimNumber: string): Promise<CarrierResponse<ClaimStatusResult>>;
  abstract fileSuplement(supplement: SupplementSubmission): Promise<CarrierResponse<SupplementResult>>;
  abstract uploadDocument(document: DocumentUpload): Promise<CarrierResponse<DocumentUploadResult>>;
  abstract getDocuments(carrierClaimId: string): Promise<CarrierResponse<CarrierDocument[]>>;
  abstract verifyWebhook(payload: string, signature: string): boolean;
  abstract parseWebhook(payload: string): CarrierWebhookPayload;
  abstract mapStatus(carrierStatus: string): CarrierClaimStatus;
  abstract mapStatusToInternal(carrierStatus: CarrierClaimStatus): string;
  
  // ============================================================
  // Common HTTP Methods
  // ============================================================
  
  protected async makeRequest<T = any>(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<CarrierResponse<T>> {
    const startTime = Date.now();
    let statusCode: number | undefined;
    
    try {
      const url = `${this.baseUrl}${path}`;
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...headers,
      };
      
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      statusCode = response.status;
      const data = await response.json();
      
      if (!response.ok) {
        const error = this.parseErrorResponse(data, response.status);
        await this.logRequest(method, path, body, data, "failed", statusCode, error.message, Date.now() - startTime);
        return { success: false, error, rawResponse: data };
      }
      
      await this.logRequest(method, path, body, data, "success", statusCode, undefined, Date.now() - startTime);
      return { success: true, data, rawResponse: data };
    } catch (error: any) {
      const carrierError: CarrierError = {
        code: "NETWORK_ERROR",
        message: error.message || "Network error occurred",
        retryable: true,
      };
      
      await this.logRequest(method, path, body, null, "failed", statusCode, carrierError.message, Date.now() - startTime);
      return { success: false, error: carrierError };
    }
  }
  
  protected getAuthHeaders(): Record<string, string> {
    if (!this.config) return {};
    
    // Bearer token
    if (this.config.accessToken) {
      return { Authorization: `Bearer ${this.config.accessToken}` };
    }
    
    // API Key
    if (this.config.apiKey) {
      return { "X-API-Key": this.config.apiKey };
    }
    
    // Basic Auth
    if (this.config.clientId && this.config.clientSecret) {
      const encoded = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
      return { Authorization: `Basic ${encoded}` };
    }
    
    return {};
  }
  
  protected parseErrorResponse(data: any, statusCode: number): CarrierError {
    return {
      code: data.error?.code || data.errorCode || `HTTP_${statusCode}`,
      message: data.error?.message || data.message || data.errorMessage || "Unknown error",
      details: data.error?.details || data.details,
      retryable: statusCode >= 500 || statusCode === 429,
    };
  }
  
  // ============================================================
  // Logging
  // ============================================================
  
  protected async logRequest(
    method: string,
    path: string,
    _requestData: any,
    _responseData: any,
    status: string,
    statusCode?: number,
    errorMessage?: string,
    durationMs?: number
  ): Promise<void> {
    // TODO: CarrierSyncLog model not yet implemented - using console logging
    console.log(`[CarrierAdapter:${this.carrierCode}] ${method} ${path} - ${status} (${statusCode || "N/A"}) ${durationMs ? `${durationMs}ms` : ""}`);
    if (errorMessage) {
      console.error(`[CarrierAdapter:${this.carrierCode}] Error: ${errorMessage}`);
    }
  }
  
  protected getActionFromPath(path: string): string {
    if (path.includes("file") || path.includes("submit")) return "file";
    if (path.includes("status")) return "status-check";
    if (path.includes("document") || path.includes("upload")) return "document-upload";
    if (path.includes("supplement")) return "supplement";
    return "api-call";
  }
  
  // ============================================================
  // Utility Methods
  // ============================================================
  
  protected formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
  
  protected formatDateTime(date: Date): string {
    return date.toISOString();
  }
  
  protected sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }
  
  protected parseAmount(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? undefined : parsed;
  }
}
