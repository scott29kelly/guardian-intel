"use client";

/**
 * SignaturePad Component
 * 
 * Canvas-based signature capture with touch and mouse support.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eraser, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function SignaturePad({
  onSave,
  onClear,
  width = 400,
  height = 200,
  label = "Signature",
  placeholder = "Sign here",
  required = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  // Get position from event
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    if (!pos) return;

    setIsDrawing(true);
    setLastPosition(pos);
  }, [getPosition]);

  // Draw
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPosition) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPosition(e);
    if (!pos) return;

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPosition(pos);
    setHasSignature(true);
  }, [isDrawing, lastPosition, getPosition]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPosition(null);
  }, []);

  // Clear signature
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onClear?.();
  }, [width, height, onClear]);

  // Save signature
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Get signature as base64 PNG
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }, [hasSignature, onSave]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="border border-border rounded-lg cursor-crosshair touch-none bg-white"
          style={{ width: "100%", maxWidth: width, height: "auto", aspectRatio: `${width}/${height}` }}
        />

        {/* Placeholder */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">{placeholder}</p>
          </div>
        )}

        {/* Signature line */}
        <div 
          className="absolute bottom-8 left-4 right-4 border-b border-gray-300"
          style={{ pointerEvents: "none" }}
        />
        <span 
          className="absolute bottom-2 left-4 text-xs text-gray-400"
          style={{ pointerEvents: "none" }}
        >
          ✗
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature}
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!hasSignature}
          className="flex-1"
        >
          <Check className="w-4 h-4" />
          Accept Signature
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// InitialsPad Component
// ============================================================

interface InitialsPadProps {
  onSave: (initials: string) => void;
  label?: string;
}

export function InitialsPad({ onSave, label = "Initials" }: InitialsPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInitials, setHasInitials] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  const width = 100;
  const height = 80;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, []);

  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    if (!pos) return;
    setIsDrawing(true);
    setLastPosition(pos);
  }, [getPosition]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPosition) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPosition(e);
    if (!pos) return;

    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPosition(pos);
    setHasInitials(true);
  }, [isDrawing, lastPosition, getPosition]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPosition(null);

    if (hasInitials) {
      const canvas = canvasRef.current;
      if (canvas) {
        onSave(canvas.toDataURL("image/png"));
      }
    }
  }, [hasInitials, onSave]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasInitials(false);
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="border border-border rounded cursor-crosshair touch-none bg-white"
          style={{ width: 80, height: 60 }}
        />
        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-text-muted hover:text-text-primary"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SignaturePad;
