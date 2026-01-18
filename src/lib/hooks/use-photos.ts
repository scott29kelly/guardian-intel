/**
 * Photo Hooks
 * 
 * React Query hooks for photo management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Types
// ============================================================

export interface Photo {
  id: string;
  createdAt: string;
  updatedAt: string;
  
  customerId: string | null;
  claimId: string | null;
  uploadedById: string;
  
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  
  // GPS
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  
  // Address
  capturedAddress: string | null;
  capturedCity: string | null;
  capturedState: string | null;
  capturedZipCode: string | null;
  
  // Categorization
  category: PhotoCategory;
  tags: string[];
  description: string | null;
  
  // Damage
  damageType: DamageType | null;
  damageSeverity: DamageSeverity | null;
  
  // Device
  deviceType: "mobile" | "tablet" | "desktop" | null;
  deviceModel: string | null;
  
  // Verification
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedById: string | null;
  
  // Related entities
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
}

export type PhotoCategory = 
  | "general" 
  | "damage" 
  | "before" 
  | "after" 
  | "roof" 
  | "siding" 
  | "gutter" 
  | "interior" 
  | "signature" 
  | "adjuster-meeting" 
  | "other";

export type DamageType = "hail" | "wind" | "water" | "wear" | "impact";
export type DamageSeverity = "minor" | "moderate" | "severe";

export interface PhotoFilters {
  customerId?: string;
  claimId?: string;
  category?: PhotoCategory;
  page?: number;
  limit?: number;
}

export interface UploadPhotoInput {
  imageData: string; // Base64
  filename?: string;
  mimeType?: string;
  customerId?: string;
  claimId?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  capturedAddress?: string;
  capturedCity?: string;
  capturedState?: string;
  capturedZipCode?: string;
  category?: PhotoCategory;
  tags?: string[];
  description?: string;
  damageType?: DamageType;
  damageSeverity?: DamageSeverity;
  deviceType?: "mobile" | "tablet" | "desktop";
  deviceModel?: string;
}

export interface UpdatePhotoInput {
  customerId?: string;
  claimId?: string;
  category?: PhotoCategory;
  tags?: string[];
  description?: string;
  damageType?: DamageType | null;
  damageSeverity?: DamageSeverity | null;
  isVerified?: boolean;
}

// ============================================================
// Query Keys
// ============================================================

export const photoKeys = {
  all: ["photos"] as const,
  lists: () => [...photoKeys.all, "list"] as const,
  list: (filters: PhotoFilters) => [...photoKeys.lists(), filters] as const,
  details: () => [...photoKeys.all, "detail"] as const,
  detail: (id: string) => [...photoKeys.details(), id] as const,
  customer: (customerId: string) => [...photoKeys.all, "customer", customerId] as const,
  claim: (claimId: string) => [...photoKeys.all, "claim", claimId] as const,
};

// ============================================================
// Hooks
// ============================================================

/**
 * Fetch photos with filters
 */
export function usePhotos(filters: PhotoFilters = {}) {
  return useQuery({
    queryKey: photoKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.customerId) params.set("customerId", filters.customerId);
      if (filters.claimId) params.set("claimId", filters.claimId);
      if (filters.category) params.set("category", filters.category);
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.limit) params.set("limit", filters.limit.toString());

      const response = await fetch(`/api/photos?${params}`);
      if (!response.ok) throw new Error("Failed to fetch photos");

      const data = await response.json();
      return data as {
        success: boolean;
        data: Photo[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });
}

/**
 * Fetch single photo
 */
export function usePhoto(id: string | null) {
  return useQuery({
    queryKey: photoKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;

      const response = await fetch(`/api/photos/${id}`);
      if (!response.ok) throw new Error("Failed to fetch photo");

      const data = await response.json();
      return data.data as Photo;
    },
    enabled: !!id,
  });
}

/**
 * Fetch customer photos
 */
export function useCustomerPhotos(customerId: string | null) {
  return usePhotos(customerId ? { customerId, limit: 100 } : {});
}

/**
 * Upload a new photo
 */
export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadPhotoInput) => {
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: photoKeys.customer(variables.customerId) });
      }
      if (variables.claimId) {
        queryClient.invalidateQueries({ queryKey: photoKeys.claim(variables.claimId) });
      }
    },
  });
}

/**
 * Update photo metadata
 */
export function useUpdatePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePhotoInput }) => {
      const response = await fetch(`/api/photos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update photo");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    },
  });
}

/**
 * Delete photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/photos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete photo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}
