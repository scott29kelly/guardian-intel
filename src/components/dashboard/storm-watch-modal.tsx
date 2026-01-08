"use client";

import { CloudLightning, Droplets, MapPin, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StormWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: () => void;
}

export function StormWatchModal({ isOpen, onClose, onViewDetails }: StormWatchModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader className="border-b-0 bg-transparent pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-accent-success" />
            Storm Watch Active
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-2">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-danger)/0.1)] rounded-full mb-4">
              <span className="w-2 h-2 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse" />
              <span className="font-mono text-sm text-accent-danger">SEVERE WEATHER ACTIVE</span>
            </div>
            <h3 className="font-display font-bold text-2xl text-text-primary mb-2">
              Franklin County Storm Alert
            </h3>
            <p className="font-mono text-sm text-text-muted">
              Severe thunderstorm with potential for large hail (1.5&quot;+) and damaging winds (60+ mph)
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="panel p-4 text-center">
              <Droplets className="w-6 h-6 text-accent-primary mx-auto mb-2" />
              <div className="font-mono text-xl font-bold text-text-primary">1.5&quot;</div>
              <div className="font-mono text-xs text-text-muted">Expected Hail</div>
            </div>
            <div className="panel p-4 text-center">
              <CloudLightning className="w-6 h-6 text-accent-warning mx-auto mb-2" />
              <div className="font-mono text-xl font-bold text-text-primary">65 mph</div>
              <div className="font-mono text-xs text-text-muted">Wind Gusts</div>
            </div>
            <div className="panel p-4 text-center">
              <MapPin className="w-6 h-6 text-accent-danger mx-auto mb-2" />
              <div className="font-mono text-xl font-bold text-text-primary">123</div>
              <div className="font-mono text-xs text-text-muted">Properties</div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onViewDetails}
              className="flex-1 px-4 py-3 rounded font-mono text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
            >
              <CloudLightning className="w-4 h-4" />
              View Storm Details
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-3 bg-surface-secondary border border-border rounded font-mono text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
