"use client";

/**
 * PhotoGallery Component
 * 
 * Displays photos in a grid with GPS info, filtering, and lightbox view.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  MapPin,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Loader2,
  Filter,
  Download,
  ExternalLink,
  Navigation,
  Clock,
  ZoomIn,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  usePhotos,
  useDeletePhoto,
  useUpdatePhoto,
  type Photo,
  type PhotoCategory,
} from "@/lib/hooks/use-photos";
import { useToast } from "@/components/ui/toast";

interface PhotoGalleryProps {
  customerId?: string;
  claimId?: string;
  showFilters?: boolean;
  onAddPhoto?: () => void;
  onAnalyze?: (photoIds: string[]) => void;
  compact?: boolean;
}

const categoryColors: Record<PhotoCategory, string> = {
  damage: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  before: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  after: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  roof: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  siding: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  gutter: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  interior: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "adjuster-meeting": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  signature: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  general: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const categoryLabels: Record<PhotoCategory, string> = {
  damage: "Damage",
  before: "Before",
  after: "After",
  roof: "Roof",
  siding: "Siding",
  gutter: "Gutter",
  interior: "Interior",
  "adjuster-meeting": "Adjuster",
  signature: "Signature",
  general: "General",
  other: "Other",
};

export function PhotoGallery({
  customerId,
  claimId,
  showFilters = true,
  onAddPhoto,
  onAnalyze,
  compact = false,
}: PhotoGalleryProps) {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | "all">("all");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, error } = usePhotos({
    customerId,
    claimId,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 100,
  });

  const deletePhoto = useDeletePhoto();
  const updatePhoto = useUpdatePhoto();

  const photos = data?.data || [];

  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Photo[]> = {};
    
    for (const photo of photos) {
      const date = new Date(photo.createdAt).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(photo);
    }
    
    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [photos]);

  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    const cats = new Set(photos.map((p) => p.category));
    return Array.from(cats) as PhotoCategory[];
  }, [photos]);

  const handleDelete = async (id: string) => {
    try {
      await deletePhoto.mutateAsync(id);
      showToast("success", "Photo Deleted", "Photo has been removed");
      setDeleteConfirm(null);
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
    } catch (err) {
      showToast("error", "Delete Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const handleVerify = async (photo: Photo) => {
    try {
      await updatePhoto.mutateAsync({
        id: photo.id,
        data: { isVerified: !photo.isVerified },
      });
      showToast(
        "success",
        photo.isVerified ? "Verification Removed" : "Photo Verified",
        photo.isVerified ? "Photo is no longer verified" : "Photo has been verified"
      );
    } catch (err) {
      showToast("error", "Update Failed", err instanceof Error ? err.message : "Please try again");
    }
  };

  const navigatePhoto = (direction: "prev" | "next") => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    if (direction === "prev" && currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    } else if (direction === "next" && currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-text-muted">Failed to load photos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {showFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`
                px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                ${selectedCategory === "all"
                  ? "bg-accent-primary text-white"
                  : "bg-surface-secondary text-text-muted hover:text-text-primary"
                }
              `}
            >
              All ({photos.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                  ${selectedCategory === cat
                    ? "bg-accent-primary text-white"
                    : "bg-surface-secondary text-text-muted hover:text-text-primary"
                  }
                `}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>

          {onAddPhoto && (
            <Button size="sm" onClick={onAddPhoto}>
              <Camera className="w-4 h-4" />
              Add Photo
            </Button>
          )}
          {onAnalyze && photos.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAnalyze(photos.map(p => p.id))}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Zap className="w-4 h-4" />
              AI Analyze
            </Button>
          )}
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="panel p-8 text-center">
          <Camera className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No Photos</h3>
          <p className="text-sm text-text-muted mb-4">
            Capture photos to document property condition
          </p>
          {onAddPhoto && (
            <Button onClick={onAddPhoto}>
              <Camera className="w-4 h-4" />
              Take Photo
            </Button>
          )}
        </div>
      ) : compact ? (
        // Compact grid view
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onClick={() => setSelectedPhoto(photo)}
              compact
            />
          ))}
        </div>
      ) : (
        // Grouped by date
        <div className="space-y-6">
          {groupedPhotos.map(([date, datePhotos]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-secondary">{date}</span>
                <span className="text-xs text-text-muted">({datePhotos.length} photos)</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {datePhotos.map((photo) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    onClick={() => setSelectedPhoto(photo)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[selectedPhoto.category]}>
                    {categoryLabels[selectedPhoto.category]}
                  </Badge>
                  {selectedPhoto.isVerified && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Check className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerify(selectedPhoto);
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    title={selectedPhoto.isVerified ? "Remove verification" : "Verify photo"}
                  >
                    <Check className={`w-5 h-5 ${selectedPhoto.isVerified ? "text-emerald-400" : "text-white"}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(selectedPhoto.id);
                    }}
                    className="p-2 rounded-full bg-white/10 hover:bg-rose-500/30 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Image */}
            <div
              className="absolute inset-0 flex items-center justify-center p-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.description || "Photo"}
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation */}
              <button
                onClick={() => navigatePhoto("prev")}
                className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => navigatePhoto("next")}
                className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="max-w-2xl mx-auto">
                {selectedPhoto.description && (
                  <p className="text-white mb-3">{selectedPhoto.description}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedPhoto.createdAt).toLocaleString()}
                  </span>
                  
                  {selectedPhoto.latitude && selectedPhoto.longitude && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      {selectedPhoto.capturedAddress || 
                       `${selectedPhoto.latitude.toFixed(4)}, ${selectedPhoto.longitude.toFixed(4)}`}
                    </span>
                  )}
                  
                  {selectedPhoto.damageType && (
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      {selectedPhoto.damageSeverity} {selectedPhoto.damageType} damage
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Delete Confirmation */}
            <AnimatePresence>
              {deleteConfirm === selectedPhoto.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-surface-primary p-6 rounded-lg max-w-sm">
                    <h3 className="text-lg font-medium text-text-primary mb-2">Delete Photo?</h3>
                    <p className="text-text-muted text-sm mb-4">
                      This action cannot be undone. The photo will be permanently removed.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-rose-500 hover:bg-rose-600"
                        onClick={() => handleDelete(selectedPhoto.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// PhotoThumbnail Component
// ============================================================

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
  compact?: boolean;
}

function PhotoThumbnail({ photo, onClick, compact }: PhotoThumbnailProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative group rounded-lg overflow-hidden border border-border
        ${compact ? "aspect-square" : "aspect-[4/3]"}
      `}
    >
      <img
        src={photo.thumbnailUrl || photo.url}
        alt={photo.description || "Photo"}
        className="w-full h-full object-cover"
      />

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Category Badge */}
      {!compact && (
        <div className="absolute top-2 left-2">
          <Badge className={`text-[10px] ${categoryColors[photo.category]}`}>
            {categoryLabels[photo.category]}
          </Badge>
        </div>
      )}

      {/* GPS Indicator */}
      {photo.latitude && photo.longitude && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/80 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Verified Badge */}
      {photo.isVerified && (
        <div className="absolute bottom-2 right-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Damage indicator */}
      {photo.category === "damage" && photo.damageSeverity && !compact && (
        <div className="absolute bottom-2 left-2">
          <Badge
            className={`text-[10px] ${
              photo.damageSeverity === "severe"
                ? "bg-rose-500/80 text-white"
                : photo.damageSeverity === "moderate"
                ? "bg-orange-500/80 text-white"
                : "bg-yellow-500/80 text-black"
            }`}
          >
            {photo.damageSeverity}
          </Badge>
        </div>
      )}
    </motion.button>
  );
}

export default PhotoGallery;
