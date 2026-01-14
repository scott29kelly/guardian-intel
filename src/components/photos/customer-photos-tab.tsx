"use client";

/**
 * CustomerPhotosTab Component
 * 
 * Photos tab for customer profile modal.
 * Shows all photos for a customer with capture functionality.
 */

import { useState } from "react";
import {
  Camera,
  MapPin,
  Image as ImageIcon,
  Download,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "./photo-gallery";
import { PhotoCaptureModal } from "./photo-capture-modal";
import { DamageAnalyzerModal } from "@/components/ai/damage-analyzer-modal";
import { usePhotos, type PhotoCategory } from "@/lib/hooks/use-photos";
import { formatCurrency } from "@/lib/utils";

interface CustomerPhotosTabProps {
  customerId: string;
  customerName: string;
}

export function CustomerPhotosTab({ customerId, customerName }: CustomerPhotosTabProps) {
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showAnalyzerModal, setShowAnalyzerModal] = useState(false);
  const [preselectedPhotoIds, setPreselectedPhotoIds] = useState<string[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<PhotoCategory>("general");

  const { data } = usePhotos({ customerId, limit: 100 });
  const photos = data?.data || [];

  const handleAnalyze = (photoIds: string[]) => {
    setPreselectedPhotoIds(photoIds);
    setShowAnalyzerModal(true);
  };

  // Calculate stats
  const stats = {
    total: photos.length,
    withGPS: photos.filter((p) => p.latitude && p.longitude).length,
    damage: photos.filter((p) => p.category === "damage").length,
    verified: photos.filter((p) => p.isVerified).length,
    beforeAfter: photos.filter((p) => p.category === "before" || p.category === "after").length,
  };

  const handleQuickCapture = (category: PhotoCategory) => {
    setDefaultCategory(category);
    setShowCaptureModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
          <div className="text-xs text-text-muted">Total Photos</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.withGPS}</div>
          <div className="text-xs text-text-muted flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> GPS Tagged
          </div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-rose-400">{stats.damage}</div>
          <div className="text-xs text-text-muted">Damage Photos</div>
        </div>
        <div className="panel p-3 text-center">
          <div className="text-2xl font-bold text-accent-primary">{stats.verified}</div>
          <div className="text-xs text-text-muted">Verified</div>
        </div>
      </div>

      {/* Quick Capture Buttons */}
      <div className="panel p-4">
        <h4 className="text-sm font-medium text-text-primary mb-3">Quick Capture</h4>
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => handleQuickCapture("damage")}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span className="text-xs text-text-secondary">Damage</span>
          </button>
          <button
            onClick={() => handleQuickCapture("before")}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-text-secondary">Before</span>
          </button>
          <button
            onClick={() => handleQuickCapture("after")}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-text-secondary">After</span>
          </button>
          <button
            onClick={() => handleQuickCapture("roof")}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs text-text-secondary">Roof</span>
          </button>
          <button
            onClick={() => setShowAnalyzerModal(true)}
            disabled={photos.length === 0}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-text-secondary">AI Analyze</span>
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
        customerId={customerId}
        showFilters={true}
        onAddPhoto={() => setShowCaptureModal(true)}
        onAnalyze={handleAnalyze}
      />

      {/* Photo Capture Modal */}
      <PhotoCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        customerId={customerId}
        defaultCategory={defaultCategory}
      />

      {/* Damage Analyzer Modal */}
      <DamageAnalyzerModal
        isOpen={showAnalyzerModal}
        onClose={() => {
          setShowAnalyzerModal(false);
          setPreselectedPhotoIds([]);
        }}
        customerId={customerId}
        preselectedPhotoIds={preselectedPhotoIds}
      />
    </div>
  );
}

export default CustomerPhotosTab;
