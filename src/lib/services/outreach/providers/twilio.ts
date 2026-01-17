/**
 * Twilio SMS Provider
 * 
 * Integration with Twilio for SMS messaging.
 * 
 * Required env vars:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

import type { SmsProvider, SendSmsOptions, SendResult, MessageStatus } from "../types";

export class TwilioProvider implements SmsProvider {
  name = "twilio";

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || "";
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  private isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  async sendSms(options: SendSmsOptions): Promise<SendResult> {
    if (!this.isConfigured()) {
      console.warn("[Twilio] Not configured, using mock mode");
      return this.mockSend(options);
    }

    try {
      const body = new URLSearchParams({
        To: this.formatPhoneNumber(options.to),
        From: options.from || this.fromNumber,
        Body: options.body,
      });

      if (options.mediaUrl) {
        body.append("MediaUrl", options.mediaUrl);
      }

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to send SMS",
          errorCode: data.code?.toString(),
        };
      }

      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      console.error("[Twilio] Send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    if (!this.isConfigured()) {
      return "delivered";
    }

    try {
      const response = await fetch(`${this.baseUrl}/Messages/${messageId}.json`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        return "pending";
      }

      const data = await response.json();
      return this.mapTwilioStatus(data.status);
    } catch {
      return "pending";
    }
  }

  private mapTwilioStatus(twilioStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      queued: "queued",
      sending: "sent",
      sent: "sent",
      delivered: "delivered",
      undelivered: "failed",
      failed: "failed",
    };
    return statusMap[twilioStatus] || "pending";
  }

  private formatPhoneNumber(phone: string): string {
    // Remove non-digits
    const digits = phone.replace(/\D/g, "");
    // Add +1 for US numbers if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    return `+${digits}`;
  }

  private mockSend(options: SendSmsOptions): SendResult {
    console.log("[Twilio Mock] Sending SMS:", {
      to: options.to,
      body: options.body.substring(0, 50) + "...",
    });
    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}

export const twilioProvider = new TwilioProvider();
