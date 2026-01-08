"use client";

/**
 * Weather Radar Map Component
 * 
 * Uses Leaflet with free data sources:
 * - OpenStreetMap tiles (base map)
 * - RainViewer API (animated radar - free, no API key)
 * - Iowa State University NEXRAD (backup radar)
 * 
 * Features:
 * - Real-time animated weather radar
 * - Storm markers for recent reports
 * - Customer location pins
 * - Click to get coordinates
 */

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Cloud, Play, Pause, SkipForward, SkipBack, Layers, RefreshCw } from "lucide-react";

// Types for RainViewer API
interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerData {
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

interface StormMarker {
  id: string;
  lat: number;
  lon: number;
  type: "hail" | "wind" | "tornado" | "customer";
  label: string;
  severity?: "low" | "moderate" | "high" | "critical";
  details?: string;
}

interface WeatherRadarMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  markers?: StormMarker[];
  showRadar?: boolean;
  showAnimation?: boolean;
  onLocationClick?: (lat: number, lon: number) => void;
  className?: string;
  compact?: boolean; // Compact mode for smaller containers
}

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

// Map click handler component
function MapClickHandler({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
  const MapEvents = dynamic(
    () => import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod;
      return function MapEventsComponent() {
        useMapEvents({
          click: (e) => {
            if (onClick) {
              onClick(e.latlng.lat, e.latlng.lng);
            }
          },
        });
        return null;
      };
    }),
    { ssr: false }
  );
  
  return <MapEvents />;
}

export function WeatherRadarMap({
  center = [40.1773, -75.0035], // Southampton, PA - Guardian HQ
  zoom = 8,
  height = "400px",
  markers = [],
  showRadar = true,
  showAnimation = true,
  onLocationClick,
  className = "",
  compact = false, // Compact mode for dashboard widget
}: WeatherRadarMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [radarData, setRadarData] = useState<RainViewerData | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Paused by default - user controls playback
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [showRadarLayer, setShowRadarLayer] = useState(showRadar);
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch radar data from RainViewer (free, no API key)
  const fetchRadarData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://api.rainviewer.com/public/weather-maps.json"
      );
      const data: RainViewerData = await response.json();
      setRadarData(data);
      // Start at most recent frame
      const totalFrames = data.radar.past.length + data.radar.nowcast.length;
      setCurrentFrame(data.radar.past.length - 1);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch radar data:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showRadar) {
      fetchRadarData();
      // Refresh radar data every 10 minutes
      const refreshInterval = setInterval(fetchRadarData, 10 * 60 * 1000);
      return () => clearInterval(refreshInterval);
    }
  }, [showRadar, fetchRadarData]);

  // Animation loop
  useEffect(() => {
    if (!radarData || !isPlaying || !showAnimation) return;

    const allFrames = [...radarData.radar.past, ...radarData.radar.nowcast];
    
    animationRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % allFrames.length);
    }, 500); // 500ms per frame

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [radarData, isPlaying, showAnimation]);

  // Get current radar tile URL
  const getRadarTileUrl = () => {
    if (!radarData) return null;
    
    const allFrames = [...radarData.radar.past, ...radarData.radar.nowcast];
    const frame = allFrames[currentFrame];
    
    if (!frame) return null;
    
    return `${radarData.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
  };

  // Get timestamp for current frame
  const getFrameTime = () => {
    if (!radarData) return "";
    
    const allFrames = [...radarData.radar.past, ...radarData.radar.nowcast];
    const frame = allFrames[currentFrame];
    
    if (!frame) return "";
    
    const date = new Date(frame.time * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Check if current frame is forecast
  const isForecast = () => {
    if (!radarData) return false;
    return currentFrame >= radarData.radar.past.length;
  };

  if (!isClient) {
    return (
      <div 
        className={`bg-void-900 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-text-secondary flex items-center gap-2">
          <Cloud className="w-5 h-5 animate-pulse" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Import Leaflet CSS
  require("leaflet/dist/leaflet.css");

  // Fix Leaflet default marker icons
  const L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });

  // Custom icons for different marker types
  const createIcon = (type: StormMarker["type"], severity?: string) => {
    const colors = {
      hail: severity === "critical" ? "#ef4444" : severity === "high" ? "#f97316" : "#eab308",
      wind: "#3b82f6",
      tornado: "#dc2626",
      customer: "#22d3ee",
    };

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: ${colors[type]};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const radarTileUrl = getRadarTileUrl();

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        {/* Dark-themed base map */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Weather radar overlay */}
        {showRadarLayer && radarTileUrl && (
          <TileLayer
            url={radarTileUrl}
            opacity={radarOpacity}
            attribution='<a href="https://www.rainviewer.com/">RainViewer</a>'
          />
        )}

        {/* Storm markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lon]}
            icon={createIcon(marker.type, marker.severity)}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-gray-900">{marker.label}</div>
                {marker.details && (
                  <div className="text-gray-600 mt-1">{marker.details}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Affected area circles for storm markers */}
        {markers
          .filter((m) => m.type !== "customer")
          .map((marker) => (
            <Circle
              key={`circle-${marker.id}`}
              center={[marker.lat, marker.lon]}
              radius={
                marker.severity === "critical"
                  ? 16000
                  : marker.severity === "high"
                  ? 12000
                  : 8000
              }
              pathOptions={{
                color:
                  marker.type === "hail"
                    ? "#f97316"
                    : marker.type === "tornado"
                    ? "#dc2626"
                    : "#3b82f6",
                fillColor:
                  marker.type === "hail"
                    ? "#f97316"
                    : marker.type === "tornado"
                    ? "#dc2626"
                    : "#3b82f6",
                fillOpacity: 0.15,
                weight: 1,
              }}
            />
          ))}
      </MapContainer>

      {/* Radar controls overlay - Compact mode for small containers */}
      {showRadar && compact && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000]">
          <div className="bg-void-950/95 backdrop-blur-sm rounded p-1.5 border border-void-700/50">
            <div className="flex items-center justify-between gap-2">
              {/* Time display - minimal */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-intel-400">
                  {isLoading ? "..." : getFrameTime()}
                </span>
                {isForecast() && (
                  <span className="text-[8px] px-1 py-0.5 bg-storm-500/30 text-storm-400 rounded">
                    FC
                  </span>
                )}
              </div>

              {/* Mini playback controls */}
              {showAnimation && radarData && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1 hover:bg-void-700 rounded transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3 text-text-secondary" />
                    ) : (
                      <Play className="w-3 h-3 text-text-secondary" />
                    )}
                  </button>
                </div>
              )}

              {/* Mini layer toggle */}
              <button
                onClick={() => setShowRadarLayer(!showRadarLayer)}
                className={`p-1 rounded transition-colors ${
                  showRadarLayer ? "bg-intel-500/20 text-intel-400" : "hover:bg-void-700 text-text-secondary"
                }`}
                title="Toggle radar"
              >
                <Layers className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Radar controls overlay - Full mode */}
      {showRadar && !compact && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-void-950/90 backdrop-blur-sm rounded-lg p-3 border border-void-700">
            <div className="flex items-center justify-between gap-4">
              {/* Time display */}
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-intel-400" />
                <span className="text-sm font-mono text-text-primary">
                  {isLoading ? "Loading..." : getFrameTime()}
                </span>
                {isForecast() && (
                  <span className="text-xs px-1.5 py-0.5 bg-storm-500/20 text-storm-400 rounded">
                    FORECAST
                  </span>
                )}
              </div>

              {/* Playback controls */}
              {showAnimation && radarData && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const allFrames = [...radarData.radar.past, ...radarData.radar.nowcast];
                      setCurrentFrame((prev) => (prev - 1 + allFrames.length) % allFrames.length);
                    }}
                    className="p-1.5 hover:bg-void-700 rounded transition-colors"
                    title="Previous frame"
                  >
                    <SkipBack className="w-4 h-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 hover:bg-void-700 rounded transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <Play className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const allFrames = [...radarData.radar.past, ...radarData.radar.nowcast];
                      setCurrentFrame((prev) => (prev + 1) % allFrames.length);
                    }}
                    className="p-1.5 hover:bg-void-700 rounded transition-colors"
                    title="Next frame"
                  >
                    <SkipForward className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              )}

              {/* Layer controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRadarLayer(!showRadarLayer)}
                  className={`p-1.5 rounded transition-colors ${
                    showRadarLayer ? "bg-intel-500/20 text-intel-400" : "hover:bg-void-700 text-text-secondary"
                  }`}
                  title="Toggle radar layer"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={fetchRadarData}
                  className="p-1.5 hover:bg-void-700 rounded transition-colors"
                  title="Refresh radar"
                >
                  <RefreshCw className={`w-4 h-4 text-text-secondary ${isLoading ? "animate-spin" : ""}`} />
                </button>
                {/* Opacity slider */}
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.1"
                  value={radarOpacity}
                  onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-void-700 rounded-lg appearance-none cursor-pointer"
                  title="Radar opacity"
                />
              </div>
            </div>

            {/* Timeline scrubber */}
            {radarData && (
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max={radarData.radar.past.length + radarData.radar.nowcast.length - 1}
                  value={currentFrame}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentFrame(parseInt(e.target.value));
                  }}
                  className="w-full h-1 bg-void-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>-2hr</span>
                  <span>Now</span>
                  <span>+30min</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend - Hidden in compact mode */}
      {!compact && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="bg-void-950/90 backdrop-blur-sm rounded-lg p-2 border border-void-700">
            <div className="text-xs font-medium text-text-secondary mb-2">Radar Intensity</div>
            <div className="flex gap-0.5">
              <div className="w-4 h-3 rounded-sm" style={{ background: "#00ff00" }} title="Light" />
              <div className="w-4 h-3 rounded-sm" style={{ background: "#ffff00" }} title="Moderate" />
              <div className="w-4 h-3 rounded-sm" style={{ background: "#ff9900" }} title="Heavy" />
              <div className="w-4 h-3 rounded-sm" style={{ background: "#ff0000" }} title="Severe" />
              <div className="w-4 h-3 rounded-sm" style={{ background: "#ff00ff" }} title="Extreme" />
            </div>
          </div>
        </div>
      )}

      {/* Coordinates display - Hidden in compact mode */}
      {!compact && (
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-void-950/90 backdrop-blur-sm rounded px-2 py-1 border border-void-700">
            <span className="text-xs font-mono text-intel-400">
              {center[0].toFixed(2)}°N {Math.abs(center[1]).toFixed(2)}°W
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
