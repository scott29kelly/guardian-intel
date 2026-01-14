"use client";

/**
 * PhotoCaptureModal Component
 * 
 * Full-screen camera capture modal with GPS tagging.
 * Designed for mobile-first field documentation.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  FlipHorizontal,
  MapPin,
  Check,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  Navigation,
  Tag,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCamera,
  getDeviceType,
  getDeviceModel,
  type CapturedPhoto,
  type GPSLocation,
} from "@/lib/hooks/use-camera";
import { useUploadPhoto, type PhotoCategory, type DamageType, type DamageSeverity } from "@/lib/hooks/use-photos";
import { useToast } from "@/components/ui/toast";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  claimId?: string;
  defaultCategory?: PhotoCategory;
  onPhotoUploaded?: (photoId: string) => void;
}

const categoryOptions: { value: PhotoCategory; label: string; icon: string }[] = [
  { value: "damage", label: "Damage", icon: "🔴" },
  { value: "before", label: "Before", icon: "📸" },
  { value: "after", label: "After", icon: "✅" },
  { value: "roof", label: "Roof", icon: "🏠" },
  { value: "siding", label: "Siding", icon: "🧱" },
  { value: "gutter", label: "Gutter", icon: "💧" },
  { value: "interior", label: "Interior", icon: "🛋️" },
  { value: "adjuster-meeting", label: "Adjuster", icon: "👤" },
  { value: "signature", label: "Signature", icon: "✍️" },
  { value: "general", label: "General", icon: "📷" },
];

const damageTypeOptions: { value: DamageType; label: string }[] = [
  { value: "hail", label: "Hail" },
  { value: "wind", label: "Wind" },
  { value: "water", label: "Water" },
  { value: "wear", label: "Wear & Tear" },
  { value: "impact", label: "Impact" },
];

const severityOptions: { value: DamageSeverity; label: string; color: string }[] = [
  { value: "minor", label: "Minor", color: "text-yellow-400" },
  { value: "moderate", label: "Moderate", color: "text-orange-400" },
  { value: "severe", label: "Severe", color: "text-rose-400" },
];

export function PhotoCaptureModal({
  isOpen,
  onClose,
  customerId,
  claimId,
  defaultCategory = "general",
  onPhotoUploaded,
}: PhotoCaptureModalProps) {
  const { showToast } = useToast();
  const uploadPhoto = useUploadPhoto();
  
  const {
    videoRef,
    isSupported,
    isActive,
    isCapturing,
    error: cameraError,
    currentLocation,
    capturedPhotos,
    startCamera,
    stopCamera,
    toggleCamera,
    capturePhoto,
    getCurrentPosition,
    removePhoto,
    clearPhotos,
  } = useCamera({ preferredCamera: "back", resolution: "high" });

  const [mode, setMode] = useState<"capture" | "review" | "details">("capture");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [category, setCategory] = useState<PhotoCategory>(defaultCategory);
  const [damageType, setDamageType] = useState<DamageType | undefined>();
  const [damageSeverity, setDamageSeverity] = useState<DamageSeverity | undefined>();
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setMode("capture");
      clearPhotos();
    }
  }, [isOpen]);

  // Handle photo capture
  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      showToast("success", "Photo Captured", currentLocation ? "GPS location tagged" : "No GPS available");
    }
  };

  // Go to review mode
  const handleReview = () => {
    if (capturedPhotos.length > 0) {
      setMode("review");
      setSelectedPhotoIndex(capturedPhotos.length - 1);
    }
  };

  // Go to details mode for final upload
  const handleProceedToDetails = () => {
    setMode("details");
  };

  // Upload all photos
  const handleUpload = async () => {
    if (capturedPhotos.length === 0) return;

    setIsUploading(true);
    const deviceType = getDeviceType();
    const deviceModel = getDeviceModel();

    try {
      const uploadPromises = capturedPhotos.map(async (photo, index) => {
        const response = await uploadPhoto.mutateAsync({
          imageData: photo.dataUrl,
          mimeType: photo.mimeType,
          customerId,
          claimId,
          latitude: photo.location?.latitude,
          longitude: photo.location?.longitude,
          altitude: photo.location?.altitude || undefined,
          accuracy: photo.location?.accuracy,
          heading: photo.location?.heading || undefined,
          category,
          description: capturedPhotos.length === 1 ? description : `${description} (${index + 1}/${capturedPhotos.length})`,
          damageType: category === "damage" ? damageType : undefined,
          damageSeverity: category === "damage" ? damageSeverity : undefined,
          deviceType,
          deviceModel,
        });

        if (response.data?.id && onPhotoUploaded) {
          onPhotoUploaded(response.data.id);
        }

        return response;
      });

      await Promise.all(uploadPromises);

      showToast(
        "success",
        "Photos Uploaded",
        `${capturedPhotos.length} photo(s) saved successfully`
      );

      onClose();
    } catch (error) {
      showToast(
        "error",
        "Upload Failed",
        error instanceof Error ? error.message : "Please try again"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Navigation for review mode
  const navigatePhoto = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (direction === "next" && selectedPhotoIndex < capturedPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handleDeletePhoto = () => {
    removePhoto(selectedPhotoIndex);
    if (selectedPhotoIndex >= capturedPhotos.length - 1) {
      setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1));
    }
    if (capturedPhotos.length <= 1) {
      setMode("capture");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="flex items-center gap-2">
              {currentLocation && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs">
                  <MapPin className="w-3 h-3" />
                  GPS Active
                </div>
              )}
              {capturedPhotos.length > 0 && (
                <Badge className="bg-accent-primary/20 text-accent-primary">
                  {capturedPhotos.length} photo(s)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {mode === "capture" && (
          <div className="h-full flex flex-col">
            {/* Camera View */}
            <div className="flex-1 relative">
              {!isSupported ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                  <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Camera Not Supported</h3>
                  <p className="text-white/60 text-center">
                    Your browser doesn't support camera access. Please use a modern browser or the native camera app.
                  </p>
                </div>
              ) : cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                  <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Camera Error</h3>
                  <p className="text-white/60 text-center mb-4">{cameraError}</p>
                  <Button onClick={startCamera}>Try Again</Button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* GPS Overlay */}
              {currentLocation && (
                <div className="absolute bottom-20 left-4 right-4 p-3 bg-black/60 backdrop-blur rounded-lg">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    <span>
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </span>
                    <span className="text-white/40">±{Math.round(currentLocation.accuracy)}m</span>
                  </div>
                </div>
              )}

              {/* Captured Photos Thumbnails */}
              {capturedPhotos.length > 0 && (
                <div className="absolute left-4 top-20 bottom-24 w-16 space-y-2 overflow-y-auto">
                  {capturedPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedPhotoIndex(index);
                        setMode("review");
                      }}
                      className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30 hover:border-white transition-colors"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Capture Controls */}
            <div className="p-6 bg-black flex items-center justify-between">
              <button
                onClick={toggleCamera}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <FlipHorizontal className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={handleCapture}
                disabled={!isActive || isCapturing}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isCapturing ? (
                  <Loader2 className="w-8 h-8 text-black animate-spin" />
                ) : (
                  <Camera className="w-10 h-10 text-black" />
                )}
              </button>

              <button
                onClick={handleReview}
                disabled={capturedPhotos.length === 0}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
              >
                <Check className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}

        {mode === "review" && capturedPhotos.length > 0 && (
          <div className="h-full flex flex-col">
            {/* Photo View */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
              <img
                src={capturedPhotos[selectedPhotoIndex]?.dataUrl}
                alt={`Photo ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation */}
              {capturedPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => navigatePhoto("prev")}
                    disabled={selectedPhotoIndex === 0}
                    className="absolute left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={() => navigatePhoto("next")}
                    disabled={selectedPhotoIndex === capturedPhotos.length - 1}
                    className="absolute right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {selectedPhotoIndex + 1} / {capturedPhotos.length}
                    </span>
                    {capturedPhotos[selectedPhotoIndex]?.location && (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        GPS Tagged
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/60">
                    {capturedPhotos[selectedPhotoIndex]?.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Review Controls */}
            <div className="p-6 bg-black flex items-center justify-between">
              <button
                onClick={() => setMode("capture")}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={handleDeletePhoto}
                className="p-3 rounded-full bg-rose-500/20 hover:bg-rose-500/30 transition-colors"
              >
                <Trash2 className="w-6 h-6 text-rose-400" />
              </button>

              <Button onClick={handleProceedToDetails} className="px-6">
                <Tag className="w-4 h-4" />
                Add Details
              </Button>
            </div>
          </div>
        )}

        {mode === "details" && (
          <div className="h-full flex flex-col bg-surface-primary overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setMode("review")}
                  className="p-2 rounded hover:bg-surface-hover transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-muted" />
                </button>
                <h2 className="font-medium text-text-primary">Photo Details</h2>
                <div className="w-9" />
              </div>
            </div>

            <div className="flex-1 p-4 space-y-6">
              {/* Photo Preview */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Category
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {categoryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCategory(opt.value)}
                      className={`
                        p-3 rounded-lg border text-center transition-all
                        ${category === opt.value
                          ? "border-accent-primary bg-accent-primary/10"
                          : "border-border hover:border-accent-primary/50"
                        }
                      `}
                    >
                      <span className="text-lg block mb-1">{opt.icon}</span>
                      <span className="text-xs text-text-secondary">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Damage Details (shown when category is "damage") */}
              {category === "damage" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Damage Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {damageTypeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDamageType(opt.value)}
                          className={`
                            px-4 py-2 rounded-lg border text-sm transition-all
                            ${damageType === opt.value
                              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                              : "border-border text-text-secondary hover:border-accent-primary/50"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Severity
                    </label>
                    <div className="flex gap-2">
                      {severityOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDamageSeverity(opt.value)}
                          className={`
                            flex-1 px-4 py-2 rounded-lg border text-sm transition-all
                            ${damageSeverity === opt.value
                              ? `border-current ${opt.color} bg-current/10`
                              : "border-border text-text-secondary hover:border-accent-primary/50"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about what this photo shows..."
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-primary"
                  rows={3}
                />
              </div>

              {/* GPS Info */}
              {capturedPhotos.some((p) => p.location) && (
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-text-secondary">
                      {capturedPhotos.filter((p) => p.location).length} of {capturedPhotos.length} photos have GPS data
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-3"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {capturedPhotos.length} Photo{capturedPhotos.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default PhotoCaptureModal;
