"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  CloudLightning,
  MapPin,
  Calendar,
  Users,
  Phone,
  FileText,
  ExternalLink,
  Wind,
  CloudRain,
  Zap,
  Thermometer,
  Droplets,
  AlertTriangle,
  Cloud,
  Sun,
  CloudSnow,
  Loader2,
  Radio,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

interface StormEvent {
  id: string;
  type: string;
  date: Date;
  location: string;
  county: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  hailSize?: number;
  windSpeed?: number;
  severity: string;
  affectedCustomers: number;
  inspectionsPending: number;
  claimsFiled: number;
  opportunity: number;
}

interface ForecastPeriod {
  name: string;
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: number;
}

interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  headline: string;
  description: string;
  instruction?: string;
  areas: string[];
  onset: string;
  expires: string;
}

interface ForecastData {
  latitude: number;
  longitude: number;
  periods: ForecastPeriod[];
  alerts: WeatherAlert[];
}

interface StormDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: StormEvent | null;
}

const stormTypeIcons: Record<string, typeof CloudLightning> = {
  hail: CloudRain,
  wind: Wind,
  thunderstorm: Zap,
  tornado: CloudLightning,
};

const severityColors: Record<string, string> = {
  minor: "bg-guardian-500/20 text-guardian-400 border-guardian-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  severe: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  catastrophic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// Mock affected customers for this storm
const mockAffectedCustomers = [
  { id: "1", name: "Robert Chen", address: "123 Oak Lane", phone: "(555) 234-5678", status: "pending_inspection" },
  { id: "2", name: "Michael Davis", address: "456 Elm Street", phone: "(555) 345-6789", status: "claim_filed" },
  { id: "3", name: "Jennifer Walsh", address: "789 Pine Ave", phone: "(555) 456-7890", status: "contacted" },
  { id: "4", name: "Thomas Anderson", address: "321 Maple Dr", phone: "(555) 567-8901", status: "not_contacted" },
  { id: "5", name: "Patricia Williams", address: "654 Cedar Blvd", phone: "(555) 678-9012", status: "not_contacted" },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  not_contacted: { label: "Not Contacted", color: "bg-surface-500/20 text-surface-400" },
  contacted: { label: "Contacted", color: "bg-blue-500/20 text-blue-400" },
  pending_inspection: { label: "Pending Inspection", color: "bg-amber-500/20 text-amber-400" },
  claim_filed: { label: "Claim Filed", color: "bg-emerald-500/20 text-emerald-400" },
};

// Location coordinates mapping
const locationCoords: Record<string, { lat: number; lon: number; state: string }> = {
  "Southampton, PA": { lat: 40.1773, lon: -75.0035, state: "PA" },
  "Doylestown, PA": { lat: 40.3101, lon: -75.1299, state: "PA" },
  "Bensalem, PA": { lat: 40.1046, lon: -74.9518, state: "PA" },
  "Fredericksburg, VA": { lat: 38.3032, lon: -77.4605, state: "VA" },
};

type TabId = "overview" | "forecast" | "alerts";

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "forecast", label: "Weather Forecast", icon: Cloud },
  { id: "alerts", label: "Alert Details", icon: AlertTriangle },
];

function getWeatherIcon(forecast: string) {
  const lower = forecast.toLowerCase();
  if (lower.includes("snow") || lower.includes("flurr")) return CloudSnow;
  if (lower.includes("rain") || lower.includes("shower")) return CloudRain;
  if (lower.includes("thunder") || lower.includes("storm")) return Zap;
  if (lower.includes("cloud") || lower.includes("overcast")) return Cloud;
  if (lower.includes("wind")) return Wind;
  return Sun;
}

export function StormDetailsModal({ isOpen, onClose, event }: StormDetailsModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Get coordinates for the event location
  const coords = event ? locationCoords[event.location] || { lat: 40.1773, lon: -75.0035, state: "PA" } : null;

  // Fetch forecast when modal opens or tab changes to forecast
  useEffect(() => {
    if (isOpen && event && (activeTab === "forecast" || activeTab === "alerts") && !forecast && !isLoadingForecast) {
      fetchForecast();
    }
  }, [isOpen, event, activeTab]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("overview");
      setForecast(null);
      setForecastError(null);
    }
  }, [isOpen]);

  const fetchForecast = async () => {
    if (!coords) return;
    
    setIsLoadingForecast(true);
    setForecastError(null);
    
    try {
      const response = await fetch(`/api/weather/forecast?lat=${coords.lat}&lon=${coords.lon}`);
      if (!response.ok) throw new Error("Failed to fetch forecast");
      const data = await response.json();
      setForecast(data);
    } catch (error) {
      console.error("Forecast fetch error:", error);
      setForecastError("Unable to load weather data");
    } finally {
      setIsLoadingForecast(false);
    }
  };

  if (!isOpen || !event) return null;

  const Icon = stormTypeIcons[event.type] || CloudLightning;

  const handleCallCustomer = (name: string, phone: string) => {
    showToast("success", "Calling...", `Dialing ${name} at ${phone}`);
    window.location.href = `tel:${phone}`;
  };

  const handleViewAllCustomers = () => {
    onClose();
    router.push(`/customers?storm=${event.id}`);
  };

  const handleGenerateReport = () => {
    showToast("success", "Report Generated", `Storm report for ${event.location} has been downloaded`);
    
    const report = `
STORM EVENT REPORT
==================
Date: ${event.date.toLocaleDateString()}
Location: ${event.location} (${event.county} County)
Type: ${event.type.toUpperCase()}
Severity: ${event.severity.toUpperCase()}
${event.hailSize ? `Hail Size: ${event.hailSize}"` : ""}
${event.windSpeed ? `Wind Speed: ${event.windSpeed} mph` : ""}

IMPACT SUMMARY
--------------
Affected Customers: ${event.affectedCustomers}
Inspections Pending: ${event.inspectionsPending}
Claims Filed: ${event.claimsFiled}
Estimated Opportunity: ${formatCurrency(event.opportunity)}

Generated by Guardian Intel on ${new Date().toLocaleString()}
    `.trim();
    
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storm-report-${event.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartCanvass = () => {
    showToast("success", "Canvass Started", `Starting storm canvass for ${event.location}`);
    onClose();
    router.push(`/customers?storm=${event.id}&action=canvass`);
  };

  // External link handlers
  const openNWSForecast = () => {
    if (coords) {
      window.open(`https://forecast.weather.gov/MapClick.php?lat=${coords.lat}&lon=${coords.lon}`, "_blank");
    }
  };

  const openNWSRadar = () => {
    if (coords) {
      window.open(`https://radar.weather.gov/?settings=v1_eyJhZ2VuZGEiOnsiaWQiOiJsb2NhbCIsImNlbnRlciI6Wy03NS4wMDM1LDQwLjE3NzNdLCJ6b29tIjo4fX0%3D#/`, "_blank");
    }
  };

  const openNOAAStormEvents = () => {
    const stateCode = coords?.state || "PA";
    window.open(`https://www.ncdc.noaa.gov/stormevents/choosedates.jsp?statefips=${stateCode}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-[hsl(var(--surface-primary))] border border-border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-5 border-b border-border ${
            event.severity === "severe" ? "bg-rose-500/5" : "bg-amber-500/5"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  event.severity === "severe" ? "bg-rose-500/20" : "bg-amber-500/20"
                }`}>
                  <Icon className={`w-7 h-7 ${
                    event.severity === "severe" ? "text-rose-400" : "text-amber-400"
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-display font-bold text-xl text-text-primary capitalize">
                      {event.type} Event
                    </h2>
                    <Badge className={severityColors[event.severity]}>
                      {event.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location} ({event.county} County)
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.date.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="p-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-surface-secondary/50 rounded-lg">
                    {event.hailSize ? (
                      <>
                        <div className="text-2xl font-bold text-text-primary">{event.hailSize}"</div>
                        <div className="text-xs text-text-muted">Hail Size</div>
                      </>
                    ) : event.windSpeed ? (
                      <>
                        <div className="text-2xl font-bold text-text-primary">{event.windSpeed}</div>
                        <div className="text-xs text-text-muted">mph Winds</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-text-primary">-</div>
                        <div className="text-xs text-text-muted">Metrics</div>
                      </>
                    )}
                  </div>
                  <div className="text-center p-3 bg-surface-secondary/50 rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{event.affectedCustomers}</div>
                    <div className="text-xs text-text-muted">Customers Affected</div>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-400">{event.inspectionsPending}</div>
                    <div className="text-xs text-text-muted">Inspections Pending</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(event.opportunity)}</div>
                    <div className="text-xs text-text-muted">Opportunity Value</div>
                  </div>
                </div>

                {/* Affected Customers */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-text-primary flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent-primary" />
                      Affected Customers
                    </h3>
                    <button
                      onClick={handleViewAllCustomers}
                      className="text-sm text-accent-primary hover:opacity-80 flex items-center gap-1"
                    >
                      View All
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {mockAffectedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-surface-secondary/30 rounded-lg border border-border hover:border-accent-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary/30 to-accent-primary/10 flex items-center justify-center text-sm font-medium text-accent-primary">
                            {customer.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{customer.name}</p>
                            <p className="text-xs text-text-muted">{customer.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusLabels[customer.status].color}>
                            {statusLabels[customer.status].label}
                          </Badge>
                          <button
                            onClick={() => handleCallCustomer(customer.name, customer.phone)}
                            className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weather Forecast Tab */}
            {activeTab === "forecast" && (
              <div className="p-4">
                {isLoadingForecast ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
                    <p className="text-text-muted">Loading weather data...</p>
                  </div>
                ) : forecastError ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Cloud className="w-12 h-12 text-text-muted mb-3" />
                    <p className="text-text-muted mb-4">{forecastError}</p>
                    <Button variant="outline" onClick={fetchForecast}>
                      Try Again
                    </Button>
                  </div>
                ) : forecast ? (
                  <div className="space-y-6">
                    {/* 7-Day Forecast */}
                    <div>
                      <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4 text-accent-primary" />
                        7-Day Forecast for {event.location}
                      </h3>
                      <div className="grid grid-cols-7 gap-2">
                        {forecast.periods.slice(0, 7).map((period, idx) => {
                          const WeatherIcon = getWeatherIcon(period.shortForecast);
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-surface-secondary/50 rounded-lg text-center border border-border hover:border-accent-primary/30 transition-colors"
                            >
                              <p className="text-xs text-text-muted mb-2">{period.name}</p>
                              <WeatherIcon className="w-6 h-6 mx-auto mb-2 text-accent-primary" />
                              <p className="text-lg font-bold text-text-primary">
                                {period.temperature}°{period.temperatureUnit}
                              </p>
                              <p className="text-xs text-text-muted mt-1 line-clamp-2">
                                {period.shortForecast}
                              </p>
                              {period.probabilityOfPrecipitation !== undefined && period.probabilityOfPrecipitation > 0 && (
                                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-400">
                                  <Droplets className="w-3 h-3" />
                                  {period.probabilityOfPrecipitation}%
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Forecast */}
                    <div>
                      <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-accent-primary" />
                        Detailed Forecast
                      </h3>
                      <div className="space-y-3">
                        {forecast.periods.slice(0, 4).map((period, idx) => {
                          const WeatherIcon = getWeatherIcon(period.shortForecast);
                          return (
                            <div
                              key={idx}
                              className="p-4 bg-surface-secondary/30 rounded-lg border border-border"
                            >
                              <div className="flex items-start gap-4">
                                <div className="p-2 bg-accent-primary/10 rounded-lg">
                                  <WeatherIcon className="w-6 h-6 text-accent-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-text-primary">{period.name}</h4>
                                    <div className="flex items-center gap-3 text-sm">
                                      <span className="flex items-center gap-1 text-text-secondary">
                                        <Thermometer className="w-4 h-4" />
                                        {period.temperature}°{period.temperatureUnit}
                                      </span>
                                      <span className="flex items-center gap-1 text-text-secondary">
                                        <Wind className="w-4 h-4" />
                                        {period.windSpeed} {period.windDirection}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-text-muted">{period.detailedForecast}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* External Links */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <span className="text-sm text-text-muted">View more on:</span>
                      <Button variant="outline" size="sm" onClick={openNWSForecast}>
                        <ExternalLink className="w-4 h-4" />
                        NWS Forecast
                      </Button>
                      <Button variant="outline" size="sm" onClick={openNWSRadar}>
                        <Radio className="w-4 h-4" />
                        Live Radar
                      </Button>
                      <Button variant="outline" size="sm" onClick={openNOAAStormEvents}>
                        <CloudLightning className="w-4 h-4" />
                        NOAA Storm History
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Cloud className="w-12 h-12 text-text-muted mb-3" />
                    <p className="text-text-muted mb-4">No forecast data available</p>
                    <Button variant="outline" onClick={fetchForecast}>
                      Load Forecast
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Alert Details Tab */}
            {activeTab === "alerts" && (
              <div className="p-4">
                {isLoadingForecast ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
                    <p className="text-text-muted">Loading alert data...</p>
                  </div>
                ) : forecast?.alerts && forecast.alerts.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-text-primary flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Active Weather Alerts ({forecast.alerts.length})
                    </h3>
                    {forecast.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-text-primary">{alert.headline}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Until {new Date(alert.expires).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className={
                            alert.severity === "extreme" || alert.severity === "severe"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-amber-500/20 text-amber-400"
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium text-text-secondary mb-1">Description</p>
                            <p className="text-text-muted whitespace-pre-wrap">{alert.description}</p>
                          </div>
                          
                          {alert.instruction && (
                            <div>
                              <p className="font-medium text-text-secondary mb-1">Instructions</p>
                              <p className="text-text-muted">{alert.instruction}</p>
                            </div>
                          )}
                          
                          {alert.areas.length > 0 && (
                            <div>
                              <p className="font-medium text-text-secondary mb-1">Affected Areas</p>
                              <p className="text-text-muted">{alert.areas.join("; ")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Cloud className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">No Active Alerts</h3>
                    <p className="text-text-muted text-center max-w-md">
                      There are currently no weather alerts for this location. This is good news for your customers!
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                      <Button variant="outline" size="sm" onClick={openNWSForecast}>
                        <ExternalLink className="w-4 h-4" />
                        Check NWS
                      </Button>
                      <Button variant="outline" size="sm" onClick={openNOAAStormEvents}>
                        <CloudLightning className="w-4 h-4" />
                        View Storm History
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary/30">
            <Button variant="outline" onClick={handleGenerateReport}>
              <FileText className="w-4 h-4" />
              Generate Report
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleViewAllCustomers}>
                <Users className="w-4 h-4" />
                View All Customers
              </Button>
              <Button onClick={handleStartCanvass}>
                <Zap className="w-4 h-4" />
                Start Canvass
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
