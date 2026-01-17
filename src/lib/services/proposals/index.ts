/**
 * Proposal Service
 * 
 * Smart proposal generation that synthesizes data from:
 * - Customer & property information
 * - Weather events & storm damage
 * - Insurance carrier data
 * - Intel items & interactions
 * - Regional pricing data
 * 
 * Usage:
 *   import { generateProposal, saveProposal } from "@/lib/services/proposals";
 *   
 *   const result = await generateProposal({ customerId: "...", createdById: "..." });
 *   if (result.success) {
 *     const saved = await saveProposal(result.proposal, userId);
 *   }
 */

export { generateProposal, saveProposal } from "./generator";
export { PricingCalculator, MATERIAL_OPTIONS, getMaterialByGrade, getMaterialById, formatCurrency } from "./pricing";
export * from "./types";
