/**
 * Outreach Service Types
 * 
 * Types for SMS, Email, and campaign management.
 */

// ============================================================
// Channel Types
// ============================================================

export type OutreachChannel = "sms" | "email" | "push";

export type MessageStatus = 
  | "pending" 
  | "queued"
  | "sent" 
  | "delivered" 
  | "opened" 
  | "clicked" 
  | "failed" 
  | "bounced"
  | "unsubscribed";

export type CampaignStatus = 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "cancelled";

export type TriggerType = "storm" | "manual" | "scheduled";

export type StormType = "hail" | "wind" | "tornado" | "flood" | "hurricane" | "general";

// ============================================================
// Message Types
// ============================================================

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

// ============================================================
// Provider Interface
// ============================================================

export interface SmsProvider {
  name: string;
  sendSms(options: SendSmsOptions): Promise<SendResult>;
  getMessageStatus?(messageId: string): Promise<MessageStatus>;
}

export interface EmailProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<SendResult>;
  getMessageStatus?(messageId: string): Promise<MessageStatus>;
}

// ============================================================
// Campaign Types
// ============================================================

export interface CampaignTarget {
  customerId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface StormTriggerData {
  stormId: string;
  stormType: StormType;
  severity: string;
  affectedZipCodes: string[];
  stormDate: Date;
  description?: string;
}

export interface PersonalizationContext {
  customer: CampaignTarget;
  storm?: StormTriggerData;
  company?: {
    name: string;
    phone: string;
    website: string;
  };
  rep?: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface CampaignConfig {
  id: string;
  name: string;
  triggerType: TriggerType;
  stormTypes?: StormType[];
  minSeverity?: string;
  targetZipCodes?: string[];
  targetStates?: string[];
  excludeRecentDays: number;
  enableSms: boolean;
  enableEmail: boolean;
  smsTemplate?: string;
  emailSubject?: string;
  emailTemplate?: string;
  delayMinutes: number;
}

export interface ExecutionResult {
  executionId: string;
  status: CampaignStatus;
  targetedCustomers: number;
  smsSent: number;
  smsDelivered: number;
  smsFailed: number;
  emailSent: number;
  emailDelivered: number;
  emailFailed: number;
  errors: string[];
}

// ============================================================
// Template Variables
// ============================================================

export const TEMPLATE_VARIABLES = {
  customer: [
    { key: "firstName", label: "First Name", example: "John" },
    { key: "lastName", label: "Last Name", example: "Smith" },
    { key: "fullName", label: "Full Name", example: "John Smith" },
    { key: "address", label: "Address", example: "123 Main St" },
    { key: "city", label: "City", example: "Dallas" },
    { key: "state", label: "State", example: "TX" },
    { key: "zipCode", label: "ZIP Code", example: "75001" },
  ],
  storm: [
    { key: "stormType", label: "Storm Type", example: "hail" },
    { key: "stormDate", label: "Storm Date", example: "January 14" },
    { key: "severity", label: "Severity", example: "moderate" },
  ],
  company: [
    { key: "companyName", label: "Company Name", example: "Guardian Roofing" },
    { key: "companyPhone", label: "Company Phone", example: "(555) 123-4567" },
    { key: "companyWebsite", label: "Website", example: "guardianroofing.com" },
  ],
  rep: [
    { key: "repName", label: "Rep Name", example: "Mike Johnson" },
    { key: "repPhone", label: "Rep Phone", example: "(555) 987-6543" },
    { key: "repEmail", label: "Rep Email", example: "mike@company.com" },
  ],
} as const;

// ============================================================
// Default Templates
// ============================================================

export const DEFAULT_TEMPLATES = {
  storm_sms: {
    name: "Post-Storm SMS",
    category: "storm",
    channel: "sms" as const,
    body: `Hi {{firstName}}, this is {{repName}} with {{companyName}}. We noticed {{stormType}} activity in your area ({{zipCode}}) on {{stormDate}}. Would you like a FREE roof inspection? Reply YES or call {{companyPhone}}. - Guardian Roofing`,
  },
  storm_email: {
    name: "Post-Storm Email",
    category: "storm",
    channel: "email" as const,
    subject: "Storm Alert: Free Roof Inspection for {{city}} Residents",
    body: `Dear {{firstName}},

We hope you and your family are safe following the recent {{stormType}} storm that passed through {{city}} on {{stormDate}}.

Storms like this can cause hidden damage to your roof that may not be immediately visible but can lead to serious problems down the road, including leaks and structural issues.

**We're offering FREE roof inspections** to homeowners in your area. Our certified inspectors will:
- Check for hail damage, missing shingles, and granule loss
- Document any damage with photos
- Provide a detailed report for your records
- Help with insurance claims if needed

**Schedule your free inspection today:**
📞 Call: {{companyPhone}}
🌐 Visit: {{companyWebsite}}

Don't wait until a small problem becomes a major expense. Most inspections take less than 30 minutes.

Best regards,
{{repName}}
{{companyName}}

P.S. Even if you don't see obvious damage, hidden issues could void your insurance coverage if left unaddressed.`,
  },
  follow_up_sms: {
    name: "Follow-Up SMS",
    category: "follow-up",
    channel: "sms" as const,
    body: `Hi {{firstName}}, following up on the storm last week. Have you had a chance to check your roof? We still have openings for free inspections this week. Call {{companyPhone}} to schedule. - {{repName}}`,
  },
};
