"use client";

/**
 * Storm Heatmap Component
 * 
 * Visualizes storm damage intensity geographically using a heatmap layer.
 * - Intensity based on severity, affected customers, and recency
 * - Gradient colors from blue (low) to red (severe)
 * - Interactive tooltips on hover
 */

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Flame, RefreshCw, Filter, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Leaflet types - using any for dynamic imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HeatLayerType = any;

// Types
interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  meta: {
    id: string;
    type: string;
    date: string;
    severity: string;
    location: string;
    hailSize?: number;
    windSpeed?: number;
    affectedCustomers: number;
    estimatedDamage?: number;
  };
}

interface HeatmapSummary {
  totalEvents: number;
  avgIntensity: number;
  topRegions: Array<{
    region: string;
    eventCount: number;
    avgIntensity: number;
    totalCustomers: number;
    totalDamage: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

interface HeatmapData {
  points: HeatmapPoint[];
  summary: HeatmapSummary;
}

interface StormHeatmapProps {
  height?: string;
  center?: [number, number];
  zoom?: number;
  months?: number;
  minSeverity?: "minor" | "moderate" | "severe" | "catastrophic";
  showLegend?: boolean;
  showSummary?: boolean;
  onPointClick?: (point: HeatmapPoint) => void;
  className?: string;
}

// Dynamically import map components to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MapContainer = dynamic<any>(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TileLayer = dynamic<any>(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Circle = dynamic<any>(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Popup = dynamic<any>(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

export function StormHeatmap({
  height = "500px",
  center = [40.1773, -75.0035], // Southampton, PA - Guardian HQ
  zoom = 7,
  months = 6,
  minSeverity = "minor",
  showLegend = true,
  showSummary = true,
  onPointClick,
  className = "",
}: StormHeatmapProps) {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatLayer, setHeatLayer] = useState<HeatLayerType | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch heatmap data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        months: months.toString(),
        minSeverity,
      });

      const response = await fetch(`/api/weather/heatmap?${params}`);
      if (!response.ok) throw new Error("Failed to fetch heatmap data");

      const result: HeatmapData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Heatmap fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load heatmap");
    } finally {
      setIsLoading(false);
    }
  }, [months, minSeverity]);

  useEffect(() => {
    if (isClient) {
      fetchData();
    }
  }, [isClient, fetchData]);

  // Initialize heatmap layer when data changes
  useEffect(() => {
    if (!isClient || !data || !mapRef.current) return;

    // Dynamically import leaflet.heat
    import("leaflet.heat").then(() => {
      const L = require("leaflet");

      // Remove existing heat layer
      if (heatLayer) {
        mapRef.current?.removeLayer(heatLayer);
      }

      // Create heat layer data
      const heatData: [number, number, number][] = data.points.map((p) => [
        p.lat,
        p.lng,
        p.intensity,
      ]);

      // Custom gradient for storm damage visualization
      const gradient = {
        0.0: "#1e40af", // Blue (low)
        0.25: "#0891b2", // Cyan
        0.5: "#eab308", // Yellow
        0.75: "#f97316", // Orange
        1.0: "#dc2626", // Red (severe)
      };

      // Create new heat layer
      const newHeatLayer = L.heatLayer(heatData, {
        radius: 35,
        blur: 25,
        maxZoom: 12,
        max: 1.0,
        minOpacity: 0.4,
        gradient,
      });

      newHeatLayer.addTo(mapRef.current);
      setHeatLayer(newHeatLayer);
    });

    return () => {
      if (heatLayer && mapRef.current) {
        mapRef.current.removeLayer(heatLayer);
      }
    };
  }, [isClient, data]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get color for intensity
  const getIntensityColor = (intensity: number) => {
    if (intensity >= 0.75) return "text-rose-400";
    if (intensity >= 0.5) return "text-amber-400";
    if (intensity >= 0.25) return "text-cyan-400";
    return "text-blue-400";
  };

  if (!isClient) {
    return (
      <div
        className={`bg-surface-secondary rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-text-muted flex items-center gap-2">
          <Flame className="w-5 h-5 animate-pulse" />
          <span>Loading heatmap...</span>
        </div>
      </div>
    );
  }

  // Import Leaflet CSS
  require("leaflet/dist/leaflet.css");

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div className="relative rounded-lg overflow-hidden border border-border" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-surface-primary/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="flex items-center gap-2 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading storm data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-surface-primary z-[1000] flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-text-muted">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
          ref={(map: LeafletMap) => {
            if (map) {
              mapRef.current = map;
            }
          }}
        >
          {/* Dark-themed base map */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Clickable circles for individual events */}
          {data?.points.map((point) => (
            <Circle
              key={point.meta.id}
              center={[point.lat, point.lng]}
              radius={3000 + point.intensity * 5000}
              pathOptions={{
                color: "transparent",
                fillColor: "transparent",
                fillOpacity: 0,
              }}
              eventHandlers={{
                click: () => onPointClick?.(point),
              }}
            >
              <Popup>
                <div className="min-w-[200px] text-sm">
                  <div className="font-bold text-gray-900 capitalize">
                    {point.meta.type} Event
                  </div>
                  <div className="text-gray-600">{point.meta.location}</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium">
                        {new Date(point.meta.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Severity:</span>
                      <span className="font-medium capitalize">{point.meta.severity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Affected:</span>
                      <span className="font-medium">{point.meta.affectedCustomers} customers</span>
                    </div>
                    {point.meta.hailSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hail Size:</span>
                        <span className="font-medium">{point.meta.hailSize}"</span>
                      </div>
                    )}
                    {point.meta.windSpeed && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Wind Speed:</span>
                        <span className="font-medium">{point.meta.windSpeed} mph</span>
                      </div>
                    )}
                    {point.meta.estimatedDamage && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Est. Damage:</span>
                        <span className="font-medium text-rose-600">
                          {formatCurrency(point.meta.estimatedDamage)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>

        {/* Legend */}
        {showLegend && (
          <div className="absolute top-4 right-4 z-[1000]">
            <div className="bg-surface-primary/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
              <div className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-accent-danger" />
                Damage Intensity
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded" style={{ background: "#dc2626" }} />
                  <span className="text-xs text-text-muted">Catastrophic</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded" style={{ background: "#f97316" }} />
                  <span className="text-xs text-text-muted">Severe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded" style={{ background: "#eab308" }} />
                  <span className="text-xs text-text-muted">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded" style={{ background: "#0891b2" }} />
                  <span className="text-xs text-text-muted">Minor</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
          <Badge className="bg-surface-primary/95 text-text-primary border-border">
            {data?.summary.totalEvents || 0} Events
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="bg-surface-primary/95 border-border h-7"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary panel */}
      {showSummary && data?.summary && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <div className="text-2xl font-bold text-text-primary">{data.summary.totalEvents}</div>
            <div className="text-xs text-text-muted">Storm Events</div>
          </div>
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <div className={`text-2xl font-bold ${getIntensityColor(data.summary.avgIntensity)}`}>
              {(data.summary.avgIntensity * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-text-muted">Avg Intensity</div>
          </div>
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <div className="text-2xl font-bold text-text-primary">
              {data.summary.topRegions.reduce((sum, r) => sum + r.totalCustomers, 0)}
            </div>
            <div className="text-xs text-text-muted">Affected Customers</div>
          </div>
          <div className="p-3 bg-surface-secondary/50 rounded-lg border border-border">
            <div className="text-2xl font-bold text-accent-success">
              {formatCurrency(
                data.summary.topRegions.reduce((sum, r) => sum + r.totalDamage, 0)
              )}
            </div>
            <div className="text-xs text-text-muted">Total Opportunity</div>
          </div>
        </div>
      )}

      {/* Top regions table */}
      {showSummary && data?.summary.topRegions && data.summary.topRegions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-text-secondary mb-2">Top Affected Regions</h4>
          <div className="space-y-2">
            {data.summary.topRegions.slice(0, 5).map((region, index) => (
              <div
                key={region.region}
                className="flex items-center justify-between p-2 bg-surface-secondary/30 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-medium text-text-muted">
                    {index + 1}
                  </span>
                  <span className="text-sm text-text-primary">{region.region}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-muted">
                    {region.eventCount} event{region.eventCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-text-muted">{region.totalCustomers} customers</span>
                  <span className="font-medium text-accent-success">
                    {formatCurrency(region.totalDamage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StormHeatmap;
