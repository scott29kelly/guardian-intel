"use client";

/**
 * Lazy-loaded Modal Components
 *
 * These modals are loaded on-demand to reduce initial bundle size.
 * Use these exports instead of direct imports for better performance.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Loading component for modals
const ModalLoading = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-surface-primary rounded-lg p-8 flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      <span className="text-text-secondary">Loading...</span>
    </div>
  </div>
);

// Customer Profile Modal - Heavy with multiple tabs and data
export const LazyCustomerProfileModal = dynamic(
  () => import("./customer-profile-modal").then((mod) => mod.CustomerProfileModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Take Action Modal - Heavy with AI insights and multiple action types
export const LazyTakeActionModal = dynamic(
  () => import("./take-action-modal").then((mod) => mod.TakeActionModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Storm Details Modal - Heavy with charts and weather data
export const LazyStormDetailsModal = dynamic(
  () => import("./storm-details-modal").then((mod) => mod.StormDetailsModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Filter Modal - Moderate complexity
export const LazyFilterModal = dynamic(
  () => import("./filter-modal").then((mod) => mod.FilterModal),
  { ssr: false }
);

// Add Customer Modal - Form with validation
export const LazyAddCustomerModal = dynamic(
  () => import("./add-customer-modal").then((mod) => mod.AddCustomerModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Customer Compare Modal - Heavy with comparison charts
export const LazyCustomerCompareModal = dynamic(
  () => import("./customer-compare-modal").then((mod) => mod.CustomerCompareModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Playbook Modal - Heavy with markdown rendering
export const LazyPlaybookModal = dynamic(
  () => import("./playbook-modal").then((mod) => mod.PlaybookModal),
  { loading: () => <ModalLoading />, ssr: false }
);

// Bulk Action Modal - Simple confirmation
export const LazyBulkActionModal = dynamic(
  () => import("./bulk-action-modal").then((mod) => mod.BulkActionModal),
  { ssr: false }
);
