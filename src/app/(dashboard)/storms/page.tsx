"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudLightning,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  ExternalLink,
  Wind,
  CloudRain,
  Zap,
  Thermometer,
  Droplets,
  Cloud,
  Sun,
  CloudSnow,
  Loader2,
  Clock,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { FilterModal } from "@/components/modals/filter-modal";
import { StormDetailsModal } from "@/components/modals/storm-details-modal";
import { PredictiveAlertsPanel } from "@/components/weather/predictive-alerts-panel";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues
const WeatherRadarMap = dynamic(
  () => import("@/components/maps/weather-radar-map").then(mod => mod.WeatherRadarMap),
  { 
    ssr: false,
    loading: () => (
      <div className="aspect-video bg-surface-secondary rounded-lg flex items-center justify-center border border-border">
        <div className="flex items-center gap-2 text-text-muted">
          <CloudLightning className="w-5 h-5 animate-pulse" />
          <span>Loading weather radar...</span>
        </div>
      </div>
    )
  }
);

// Storm event type
interface StormEvent {
  id: string;
  type: string;
  date: Date;
  location: string;
  county: string;
  hailSize?: number;
  windSpeed?: number;
  severity: string;
  affectedCustomers: number;
  inspectionsPending: number;
  claimsFiled: number;
  opportunity: number;
}

// Mock storm data - Guardian service area (PA, NJ, DE, MD, VA, NY)
const activeAlerts = [
  {
    id: "alert-1",
    type: "hail",
    severity: "severe",
    headline: "Severe Thunderstorm Warning",
    description: "Large hail up to 1.5 inches expected. Damaging winds up to 60 mph possible.",
    areas: ["Bucks County, PA", "Montgomery County, PA"],
    onset: new Date("2026-01-07T14:00:00"),
    expires: new Date("2026-01-07T18:00:00"),
    affectedCustomers: 23,
    estimatedOpportunity: 345000,
  },
  {
    id: "alert-2",
    type: "wind",
    severity: "moderate",
    headline: "Wind Advisory",
    description: "Southwest winds 25 to 35 mph with gusts up to 50 mph expected.",
    areas: ["Spotsylvania County, VA"],
    onset: new Date("2026-01-07T16:00:00"),
    expires: new Date("2026-01-08T06:00:00"),
    affectedCustomers: 8,
    estimatedOpportunity: 120000,
  },
];

const recentStormEvents: StormEvent[] = [
  {
    id: "event-1",
    type: "hail",
    date: new Date("2026-01-02"),
    location: "Southampton, PA",
    county: "Bucks",
    hailSize: 1.25,
    severity: "severe",
    affectedCustomers: 45,
    inspectionsPending: 12,
    claimsFiled: 8,
    opportunity: 675000,
  },
  {
    id: "event-2",
    type: "wind",
    date: new Date("2025-12-28"),
    location: "Doylestown, PA",
    county: "Bucks",
    windSpeed: 65,
    severity: "severe",
    affectedCustomers: 32,
    inspectionsPending: 5,
    claimsFiled: 15,
    opportunity: 480000,
  },
  {
    id: "event-3",
    type: "hail",
    date: new Date("2025-12-15"),
    location: "Bensalem, PA",
    county: "Bucks",
    hailSize: 0.75,
    severity: "moderate",
    affectedCustomers: 28,
    inspectionsPending: 3,
    claimsFiled: 18,
    opportunity: 392000,
  },
  {
    id: "event-4",
    type: "thunderstorm",
    date: new Date("2025-11-20"),
    location: "Fredericksburg, VA",
    county: "Spotsylvania",
    windSpeed: 55,
    hailSize: 0.5,
    severity: "moderate",
    affectedCustomers: 18,
    inspectionsPending: 0,
    claimsFiled: 12,
    opportunity: 234000,
  },
];

const stormTypeIcons: Record<string, typeof CloudLightning> = {
  hail: CloudRain,
  wind: Wind,
  thunderstorm: Zap,
  tornado: CloudLightning,
};

// Location coordinates mapping
const locationCoords: Record<string, { lat: number; lon: number }> = {
  "Southampton, PA": { lat: 40.1773, lon: -75.0035 },
  "Doylestown, PA": { lat: 40.3101, lon: -75.1299 },
  "Bensalem, PA": { lat: 40.1046, lon: -74.9518 },
  "Fredericksburg, VA": { lat: 38.3032, lon: -77.4605 },
};

// Weather icon helper
function getWeatherIcon(forecast: string) {
  const lower = forecast.toLowerCase();
  if (lower.includes("snow") || lower.includes("flurr")) return CloudSnow;
  if (lower.includes("rain") || lower.includes("shower")) return CloudRain;
  if (lower.includes("thunder") || lower.includes("storm")) return Zap;
  if (lower.includes("cloud") || lower.includes("overcast")) return Cloud;
  if (lower.includes("wind")) return Wind;
  return Sun;
}

// Weather Preview Widget Component
function WeatherPreview({ location }: { location: string }) {
  const [forecast, setForecast] = useState<{
    temperature: number;
    temperatureUnit: string;
    shortForecast: string;
    windSpeed: string;
    probabilityOfPrecipitation?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const coords = locationCoords[location];
    if (!coords) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchForecast = async () => {
      try {
        const response = await fetch(`/api/weather/forecast?lat=${coords.lat}&lon=${coords.lon}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        if (data.periods && data.periods.length > 0) {
          setForecast(data.periods[0]);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (error || !forecast) {
    return null;
  }

  const WeatherIcon = getWeatherIcon(forecast.shortForecast);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-surface-secondary/50 rounded-lg border border-border">
      <WeatherIcon className="w-5 h-5 text-accent-primary" />
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 font-medium text-text-primary">
          <Thermometer className="w-3.5 h-3.5 text-text-muted" />
          {forecast.temperature}°{forecast.temperatureUnit}
        </span>
        <span className="text-text-muted hidden sm:inline">{forecast.shortForecast}</span>
        {forecast.probabilityOfPrecipitation !== undefined && forecast.probabilityOfPrecipitation > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Droplets className="w-3.5 h-3.5" />
            {forecast.probabilityOfPrecipitation}%
          </span>
        )}
      </div>
    </div>
  );
}

const severityColors: Record<string, string> = {
  minor: "bg-accent-primary/20 text-accent-primary border-accent-primary/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  severe: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  catastrophic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// Filter configuration
const stormFilterConfig = [
  {
    id: "type",
    label: "Storm Type",
    options: [
      { value: "hail", label: "Hail", count: 2 },
      { value: "wind", label: "Wind", count: 1 },
      { value: "thunderstorm", label: "Thunderstorm", count: 1 },
      { value: "tornado", label: "Tornado", count: 0 },
    ],
    multiSelect: true,
  },
  {
    id: "severity",
    label: "Severity",
    options: [
      { value: "minor", label: "Minor" },
      { value: "moderate", label: "Moderate", count: 2 },
      { value: "severe", label: "Severe", count: 2 },
      { value: "catastrophic", label: "Catastrophic" },
    ],
    multiSelect: true,
  },
  {
    id: "timeframe",
    label: "Time Frame",
    options: [
      { value: "7d", label: "Last 7 Days" },
      { value: "30d", label: "Last 30 Days" },
      { value: "90d", label: "Last 90 Days" },
      { value: "1y", label: "Last Year" },
    ],
  },
  {
    id: "county",
    label: "County",
    options: [
      { value: "bucks", label: "Bucks County, PA", count: 3 },
      { value: "montgomery", label: "Montgomery County, PA", count: 1 },
      { value: "spotsylvania", label: "Spotsylvania County, VA", count: 1 },
    ],
    multiSelect: true,
  },
];

type TabType = "realtime" | "forecast";

export default function StormsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<StormEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  
  // Tab state - check URL params for initial tab
  const initialTab = searchParams.get("tab") === "forecast" ? "forecast" : "realtime";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const forecastFilter = searchParams.get("filter") as "all" | "urgent" | undefined;

  const totalOpportunity = recentStormEvents.reduce((sum, e) => sum + e.opportunity, 0);
  const totalAffected = recentStormEvents.reduce((sum, e) => sum + e.affectedCustomers, 0);
  const totalPending = recentStormEvents.reduce((sum, e) => sum + e.inspectionsPending, 0);

  const handleApplyFilters = (filters: Record<string, string[]>) => {
    setActiveFilters(filters);
    const filterCount = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0);
    if (filterCount > 0) {
      showToast("success", "Filters Applied", `${filterCount} filter(s) active`);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    showToast("info", "Refreshing Data", "Fetching latest weather data from NOAA...");
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    showToast("success", "Data Updated", "Weather data refreshed successfully");
  };

  const handleOpenWeatherMap = () => {
    window.open("https://www.weather.gov/", "_blank");
  };

  const handleViewAffectedCustomers = (alertId: string, areas: string[]) => {
    showToast("info", "Loading Customers", `Finding customers in ${areas.join(", ")}...`);
    // Extract counties from areas (e.g., "Bucks County, PA" -> "Bucks")
    const counties = areas.map(area => {
      const match = area.match(/^([^,]+)\s+County/i);
      return match ? match[1] : area.split(",")[0].trim();
    });
    router.push(`/customers?filter=storm-affected&counties=${encodeURIComponent(counties.join(","))}&alertId=${alertId}`);
  };

  const handleViewEventDetails = (event: StormEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleOpenNOAA = () => {
    window.open("https://www.ncdc.noaa.gov/stormevents/", "_blank");
  };

  // Filter storm events based on active filters
  const filteredEvents = recentStormEvents.filter(event => {
    if (activeFilters.type?.length && !activeFilters.type.includes(event.type)) {
      return false;
    }
    if (activeFilters.severity?.length && !activeFilters.severity.includes(event.severity)) {
      return false;
    }
    if (activeFilters.county?.length && !activeFilters.county.includes(event.county.toLowerCase())) {
      return false;
    }
    return true;
  });

  const activeFilterCount = Object.values(activeFilters).reduce((acc, arr) => acc + arr.length, 0);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    if (tab === "forecast") {
      url.searchParams.set("tab", "forecast");
    } else {
      url.searchParams.delete("tab");
    }
    url.searchParams.delete("filter");
    window.history.replaceState({}, "", url.toString());
  };

  const handleCustomerClick = (customerId: string) => {
    router.push(`/customers?id=${customerId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Storm Intelligence
          </h1>
          <p className="text-text-muted">
            Real-time weather alerts and predictive storm forecasts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "realtime" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowFilterModal(true)}
                className={activeFilterCount > 0 ? "border-accent-primary text-accent-primary" : ""}
              >
                <Filter className="w-4 h-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge className="ml-1.5 bg-accent-primary/20 text-accent-primary">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </>
          )}
          <Button onClick={handleOpenWeatherMap}>
            <ExternalLink className="w-4 h-4" />
            Weather Map
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg w-fit">
        <button
          onClick={() => handleTabChange("realtime")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "realtime"
              ? "bg-accent-primary text-white shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-surface-primary"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Real-time Alerts
        </button>
        <button
          onClick={() => handleTabChange("forecast")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "forecast"
              ? "bg-accent-primary text-white shadow-sm"
              : "text-text-muted hover:text-text-primary hover:bg-surface-primary"
          }`}
        >
          <Target className="w-4 h-4" />
          72-Hour Forecast
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
            NEW
          </Badge>
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "forecast" ? (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PredictiveAlertsPanel
              onCustomerClick={handleCustomerClick}
              initialFilter={forecastFilter}
            />
          </motion.div>
        ) : (
          <motion.div
            key="realtime"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="font-display text-xl font-bold text-text-primary">
              Active Weather Alerts
            </h2>
            <Badge variant="warning">{activeAlerts.length} Active</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeAlerts.map((alert) => {
              const Icon = stormTypeIcons[alert.type] || CloudLightning;
              return (
                <Card key={alert.id} className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-amber-500/20">
                        <Icon className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-text-primary">{alert.headline}</h3>
                            <p className="text-sm text-text-muted mt-1">{alert.description}</p>
                          </div>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                          <span className="flex items-center gap-1 text-text-secondary">
                            <MapPin className="w-4 h-4" />
                            {alert.areas.join(", ")}
                          </span>
                          <span className="flex items-center gap-1 text-text-secondary">
                            <Calendar className="w-4 h-4" />
                            Until {alert.expires.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="flex items-center gap-1 text-text-secondary">
                            <Users className="w-4 h-4" />
                            {alert.affectedCustomers} customers in area
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-500/20">
                          <div>
                            <span className="text-sm text-text-muted">Estimated Opportunity:</span>
                            <span className="ml-2 text-lg font-bold text-accent-success">
                              {formatCurrency(alert.estimatedOpportunity)}
                            </span>
                          </div>
                          <Button size="sm" onClick={() => handleViewAffectedCustomers(alert.id, alert.areas)}>
                            View Affected Customers
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Storm Opportunity (90 days)"
          value={formatCurrency(totalOpportunity)}
          change={23}
          changeLabel="vs previous quarter"
          trend="up"
          icon={TrendingUp}
          glowColor="success"
        />
        <MetricCard
          title="Affected Customers"
          value={totalAffected}
          change={15}
          changeLabel="new this month"
          trend="up"
          icon={Users}
          glowColor="primary"
        />
        <MetricCard
          title="Inspections Pending"
          value={totalPending}
          icon={Calendar}
          glowColor="accent"
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts.length}
          icon={AlertTriangle}
          glowColor="danger"
        />
      </div>

      {/* Interactive Storm Map with Live Radar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent-primary" />
              Storm Event Map
              <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                LIVE RADAR
              </Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleOpenNOAA}>
              <ExternalLink className="w-4 h-4" />
              NOAA Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WeatherRadarMap
            center={[40.1773, -75.0035]} // Southampton, PA - Guardian HQ
            zoom={7}
            height="450px"
            showRadar={true}
            showAnimation={true}
            markers={[
              // Recent storm event markers - Guardian service area (PA, NJ, DE, MD, VA, NY)
              ...filteredEvents.map(event => ({
                id: event.id,
                lat: event.location === "Southampton, PA" ? 40.1773 : 
                     event.location === "Doylestown, PA" ? 40.3101 :
                     event.location === "Bensalem, PA" ? 40.1046 : 
                     event.location === "Fredericksburg, VA" ? 38.3032 : 40.0856,
                lon: event.location === "Southampton, PA" ? -75.0035 :
                     event.location === "Doylestown, PA" ? -75.1299 :
                     event.location === "Bensalem, PA" ? -74.9518 : 
                     event.location === "Fredericksburg, VA" ? -77.4605 : -74.8059,
                type: event.type as "hail" | "wind",
                label: `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event - ${event.location}`,
                severity: event.severity as "low" | "moderate" | "high" | "critical",
                details: event.hailSize 
                  ? `${event.hailSize}" hail - ${event.affectedCustomers} customers affected`
                  : `${event.windSpeed} mph winds - ${event.affectedCustomers} customers affected`,
              })),
            ]}
          />
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-text-muted">Severe Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-text-muted">Moderate Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="text-text-muted">Customer Locations</span>
              </div>
            </div>
            <span className="text-text-muted font-mono text-xs">
              Data: RainViewer + NOAA
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Storm Events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-text-primary">
            Recent Storm Events
          </h2>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setActiveFilters({})}
              className="text-sm text-accent-primary hover:opacity-80"
            >
              Clear Filters ({activeFilterCount})
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {filteredEvents.map((event, index) => {
            const Icon = stormTypeIcons[event.type] || CloudLightning;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:border-accent-primary/50 ${
                    selectedEvent?.id === event.id ? "border-accent-primary" : ""
                  }`}
                  onClick={() => handleViewEventDetails(event)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        event.severity === "severe" ? "bg-rose-500/20" : "bg-amber-500/20"
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          event.severity === "severe" ? "text-rose-400" : "text-amber-400"
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-text-primary capitalize">
                            {event.type} Event
                          </h3>
                          <Badge className={severityColors[event.severity]}>
                            {event.severity}
                          </Badge>
                          {event.hailSize && (
                            <Badge variant="secondary">{event.hailSize}" Hail</Badge>
                          )}
                          {event.windSpeed && (
                            <Badge variant="secondary">{event.windSpeed} mph</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location} ({event.county} County)
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {event.date.toLocaleDateString()}
                          </span>
                        </div>
                        {/* Weather Preview */}
                        <div className="mt-3">
                          <WeatherPreview location={event.location} />
                        </div>
                      </div>
                      
                      <div className="hidden lg:flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-text-primary">{event.affectedCustomers}</p>
                          <p className="text-xs text-text-muted">Affected</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-400">{event.inspectionsPending}</p>
                          <p className="text-xs text-text-muted">Pending</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-accent-success">{event.claimsFiled}</p>
                          <p className="text-xs text-text-muted">Claims</p>
                        </div>
                        <div className="text-center pl-4 border-l border-border">
                          <p className="text-2xl font-bold text-text-primary">{formatCurrency(event.opportunity)}</p>
                          <p className="text-xs text-text-muted">Opportunity</p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEventDetails(event);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                    
                    {/* Mobile stats */}
                    <div className="lg:hidden grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-xl font-bold text-text-primary">{event.affectedCustomers}</p>
                        <p className="text-xs text-text-muted">Affected</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-400">{event.inspectionsPending}</p>
                        <p className="text-xs text-text-muted">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-accent-success">{event.claimsFiled}</p>
                        <p className="text-xs text-text-muted">Claims</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-text-primary">{formatCurrency(event.opportunity)}</p>
                        <p className="text-xs text-text-muted">Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filteredEvents.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CloudLightning className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No storm events found</h3>
                <p className="text-text-muted mb-4">
                  Try adjusting your filters to see more events
                </p>
                <Button variant="outline" onClick={() => setActiveFilters({})}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Storm Events"
        filters={stormFilterConfig}
        activeFilters={activeFilters}
        onApply={handleApplyFilters}
      />

      {/* Storm Details Modal */}
      <StormDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        event={selectedEvent}
      />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
