/**
 * SendGrid Email Provider
 * 
 * Integration with SendGrid for email messaging.
 * 
 * Required env vars:
 * - SENDGRID_API_KEY
 * - SENDGRID_FROM_EMAIL
 * - SENDGRID_FROM_NAME (optional)
 */

import type { EmailProvider, SendEmailOptions, SendResult, MessageStatus } from "../types";

export class SendGridProvider implements EmailProvider {
  name = "sendgrid";

  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl = "https://api.sendgrid.com/v3";

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || "";
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "";
    this.fromName = process.env.SENDGRID_FROM_NAME || "Guardian Roofing";
  }

  private isConfigured(): boolean {
    return !!(this.apiKey && this.fromEmail);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendResult> {
    if (!this.isConfigured()) {
      console.warn("[SendGrid] Not configured, using mock mode");
      return this.mockSend(options);
    }

    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: {
          email: options.from || this.fromEmail,
          name: this.fromName,
        },
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        content: [
          {
            type: options.html ? "text/html" : "text/plain",
            value: options.html || options.body,
          },
        ],
        attachments: options.attachments?.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
        })),
      };

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      // SendGrid returns 202 for successful sends
      if (response.status === 202) {
        const messageId = response.headers.get("X-Message-Id") || `sg-${Date.now()}`;
        return {
          success: true,
          messageId,
        };
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.errors?.[0]?.message || "Failed to send email",
        errorCode: response.status.toString(),
      };
    } catch (error) {
      console.error("[SendGrid] Send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getMessageStatus(_messageId: string): Promise<MessageStatus> {
    // SendGrid doesn't provide real-time status via API
    // Would need to use webhooks for actual status tracking
    return "sent";
  }

  private mockSend(options: SendEmailOptions): SendResult {
    console.log("[SendGrid Mock] Sending email:", {
      to: options.to,
      subject: options.subject,
    });
    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
    };
  }
}

export const sendGridProvider = new SendGridProvider();
