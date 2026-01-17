/**
 * Camera Capture Hook with GPS
 * 
 * Provides camera access, photo capture, and GPS location for field documentation.
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ============================================================
// Types
// ============================================================

export interface GPSLocation {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  timestamp: number;
}

export interface CapturedPhoto {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  location: GPSLocation | null;
  timestamp: Date;
}

export interface CameraState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isActive: boolean;
  isFrontCamera: boolean;
  isCapturing: boolean;
  error: string | null;
}

export interface UseCameraOptions {
  preferredCamera?: "front" | "back";
  resolution?: "low" | "medium" | "high" | "max";
  enableAudio?: boolean;
}

// ============================================================
// Hook
// ============================================================

export function useCamera(options: UseCameraOptions = {}) {
  const {
    preferredCamera = "back",
    resolution = "high",
    enableAudio = false,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>({
    isSupported: false,
    isPermissionGranted: false,
    isActive: false,
    isFrontCamera: preferredCamera === "front",
    isCapturing: false,
    error: null,
  });

  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

  // Check if camera is supported
  useEffect(() => {
    const isSupported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
    setState((prev) => ({ ...prev, isSupported }));
  }, []);

  // Get video constraints based on resolution
  const getConstraints = useCallback(() => {
    const resolutionMap = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      max: { width: 3840, height: 2160 },
    };

    const { width, height } = resolutionMap[resolution];

    return {
      video: {
        facingMode: state.isFrontCamera ? "user" : "environment",
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: enableAudio,
    };
  }, [resolution, state.isFrontCamera, enableAudio]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Camera not supported on this device",
      }));
      return false;
    }

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = getConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({
        ...prev,
        isActive: true,
        isPermissionGranted: true,
        error: null,
      }));

      // Start tracking GPS
      startGPSTracking();

      return true;
    } catch (error: any) {
      let errorMessage = "Failed to access camera";

      if (error.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please allow camera access.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on this device";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is in use by another application";
      }

      setState((prev) => ({
        ...prev,
        isActive: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [state.isSupported, getConstraints]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  // Toggle between front and back camera
  const toggleCamera = useCallback(async () => {
    setState((prev) => ({ ...prev, isFrontCamera: !prev.isFrontCamera }));
    
    // Restart camera with new facing mode
    if (state.isActive) {
      stopCamera();
      // Small delay to ensure stream is fully stopped
      setTimeout(() => startCamera(), 100);
    }
  }, [state.isActive, stopCamera, startCamera]);

  // Capture photo
  const capturePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (!videoRef.current || !state.isActive) {
      return null;
    }

    setState((prev) => ({ ...prev, isCapturing: true }));

    try {
      const video = videoRef.current;
      
      // Create canvas if not exists
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.92
        );
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      const photo: CapturedPhoto = {
        dataUrl,
        blob,
        width: canvas.width,
        height: canvas.height,
        mimeType: "image/jpeg",
        location: currentLocation,
        timestamp: new Date(),
      };

      setCapturedPhotos((prev) => [...prev, photo]);

      return photo;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to capture photo",
      }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isCapturing: false }));
    }
  }, [state.isActive, currentLocation]);

  // Start GPS tracking
  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.warn("GPS error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Watch for position updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.warn("GPS watch error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Store watch ID for cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Get current GPS position (one-time)
  const getCurrentPosition = useCallback((): Promise<GPSLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          };
          setCurrentLocation(location);
          resolve(location);
        },
        (error) => {
          console.warn("GPS error:", error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Clear captured photos
  const clearPhotos = useCallback(() => {
    setCapturedPhotos([]);
  }, []);

  // Remove specific photo
  const removePhoto = useCallback((index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    // Refs to attach to video element
    videoRef,

    // State
    ...state,
    currentLocation,
    capturedPhotos,

    // Actions
    startCamera,
    stopCamera,
    toggleCamera,
    capturePhoto,
    getCurrentPosition,
    clearPhotos,
    removePhoto,
  };
}

// ============================================================
// Utility: Get device type
// ============================================================

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "mobile";
  }
  
  return "desktop";
}

// ============================================================
// Utility: Get device model
// ============================================================

export function getDeviceModel(): string {
  const ua = navigator.userAgent;
  
  // iOS devices
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  
  // Android - try to extract model
  const androidMatch = ua.match(/Android[^;]*;\s*([^;)]+)/);
  if (androidMatch) return androidMatch[1].trim();
  
  // Generic
  return navigator.platform || "Unknown";
}
