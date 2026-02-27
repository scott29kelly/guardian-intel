-- Migration: add-missing-models
-- Applied via prisma db push, then marked as applied with prisma migrate resolve.
-- This migration adds 9 new models and indexes to existing tables.

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'sent', 'signed', 'active', 'completed', 'cancelled');
CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');

-- CreateTable: Photo
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Contract
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "templateId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'draft',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deposit" DOUBLE PRECISION,
    "scopeOfWork" TEXT,
    "materialSpecs" TEXT,
    "startDate" TIMESTAMP(3),
    "estimatedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByEmail" TEXT,
    "signatureUrl" TEXT,
    "termsAndConditions" TEXT,
    "notes" TEXT,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContractTemplate
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Proposal
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineItems" TEXT,
    "scopeOfWork" TEXT,
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Competitor
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "headquarters" TEXT,
    "serviceAreas" TEXT,
    "yearFounded" INTEGER,
    "employeeCount" INTEGER,
    "pricingTier" TEXT,
    "specialties" TEXT,
    "certifications" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "salesTactics" TEXT,
    "pricingNotes" TEXT,
    "marketShare" DOUBLE PRECISION,
    "reputation" DOUBLE PRECISION,
    "avgReviewScore" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CompetitorActivity
CREATE TABLE "CompetitorActivity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitorId" TEXT NOT NULL,
    "customerId" TEXT,
    "reportedById" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "description" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "priceComparison" TEXT,
    "outcome" TEXT,
    "outcomeReason" TEXT,
    "dealValue" DOUBLE PRECISION,
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CompetitorActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OutreachCampaign
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "campaignType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "channel" TEXT NOT NULL,
    "templateContent" TEXT,
    "templateSubject" TEXT,
    "targetCriteria" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CampaignExecution
CREATE TABLE "CampaignExecution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "sentMessages" INTEGER NOT NULL DEFAULT 0,
    "failedMessages" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    CONSTRAINT "CampaignExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OutreachMessage
CREATE TABLE "OutreachMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "externalMessageId" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Photo_customerId_idx" ON "Photo"("customerId");
CREATE INDEX "Photo_category_idx" ON "Photo"("category");
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");
CREATE INDEX "Contract_createdById_idx" ON "Contract"("createdById");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
CREATE UNIQUE INDEX "Proposal_proposalNumber_key" ON "Proposal"("proposalNumber");
CREATE INDEX "Proposal_customerId_idx" ON "Proposal"("customerId");
CREATE INDEX "Proposal_createdById_idx" ON "Proposal"("createdById");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");
CREATE INDEX "CompetitorActivity_competitorId_idx" ON "CompetitorActivity"("competitorId");
CREATE INDEX "CompetitorActivity_customerId_idx" ON "CompetitorActivity"("customerId");
CREATE INDEX "CompetitorActivity_zipCode_idx" ON "CompetitorActivity"("zipCode");
CREATE INDEX "CompetitorActivity_activityType_idx" ON "CompetitorActivity"("activityType");
CREATE INDEX "CompetitorActivity_createdAt_idx" ON "CompetitorActivity"("createdAt");
CREATE INDEX "OutreachCampaign_createdById_idx" ON "OutreachCampaign"("createdById");
CREATE INDEX "CampaignExecution_campaignId_idx" ON "CampaignExecution"("campaignId");
CREATE INDEX "CampaignExecution_status_idx" ON "CampaignExecution"("status");
CREATE INDEX "OutreachMessage_executionId_idx" ON "OutreachMessage"("executionId");
CREATE INDEX "OutreachMessage_customerId_idx" ON "OutreachMessage"("customerId");
CREATE INDEX "OutreachMessage_status_idx" ON "OutreachMessage"("status");

-- Foreign Keys
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompetitorActivity" ADD CONSTRAINT "CompetitorActivity_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignExecution" ADD CONSTRAINT "CampaignExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignExecution" ADD CONSTRAINT "CampaignExecution_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "CampaignExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutreachMessage" ADD CONSTRAINT "OutreachMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
