"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { LazyFilterModal, LazyStormDetailsModal } from "@/components/modals/lazy-modals";
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

// Alert type from API
interface StormAlert {
  id: string;
  type: string;
  severity: string;
  headline: string;
  description: string;
  areas: string[];
  onset: string;
  expires: string;
  affectedCustomers: number;
  estimatedOpportunity: number;
}

// API response shape
interface StormsApiResponse {
  success: boolean;
  data: {
    events: Array<{
      id: string;
      type: string;
      date: string;
      location: string;
      county: string;
      state: string;
      latitude: number;
      longitude: number;
      hailSize: number | null;
      windSpeed: number | null;
      severity: string;
      affectedCustomers: number;
      inspectionsPending: number;
      claimsFiled: number;
      opportunity: number;
    }>;
    alerts: StormAlert[];
    stats: {
      totalOpportunity: number;
      totalAffected: number;
      totalPending: number;
      alertCount: number;
    };
    filterOptions: {
      types: Array<{ value: string; label: string; count: number }>;
      severities: Array<{ value: string; label: string; count: number }>;
      counties: Array<{ value: string; label: string; count: number }>;
    };
  };
  error?: string;
}

const stormTypeIcons: Record<string, typeof CloudLightning> = {
  hail: CloudRain,
  wind: Wind,
  thunderstorm: Zap,
  tornado: CloudLightning,
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
function WeatherPreview({ latitude, longitude }: { latitude?: number; longitude?: number }) {
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
    if (!latitude || !longitude) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchForecast = async () => {
      try {
        const response = await fetch(`/api/weather/forecast?lat=${latitude}&lon=${longitude}`);
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
  }, [latitude, longitude]);

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
          {forecast.temperature}&deg;{forecast.temperatureUnit}
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

// Default filter configuration (will be enriched with real counts from API)
const defaultStormFilterConfig = [
  {
    id: "type",
    label: "Storm Type",
    options: [
      { value: "hail", label: "Hail", count: 0 },
      { value: "wind", label: "Wind", count: 0 },
      { value: "thunderstorm", label: "Thunderstorm", count: 0 },
      { value: "tornado", label: "Tornado", count: 0 },
    ],
    multiSelect: true,
  },
  {
    id: "severity",
    label: "Severity",
    options: [
      { value: "minor", label: "Minor", count: 0 },
      { value: "moderate", label: "Moderate", count: 0 },
      { value: "severe", label: "Severe", count: 0 },
      { value: "catastrophic", label: "Catastrophic", count: 0 },
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
    options: [] as { value: string; label: string; count: number }[],
    multiSelect: true,
  },
];

export default function StormsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<StormEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Data state
  const [stormEvents, setStormEvents] = useState<StormEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<StormAlert[]>([]);
  const [stats, setStats] = useState({ totalOpportunity: 0, totalAffected: 0, totalPending: 0, alertCount: 0 });
  const [filterOptions, setFilterOptions] = useState<StormsApiResponse["data"]["filterOptions"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Derive days param from timeframe filter
  const daysFromFilter = useMemo(() => {
    const tf = activeFilters.timeframe?.[0];
    switch (tf) {
      case "7d": return 7;
      case "30d": return 30;
      case "1y": return 365;
      default: return 90;
    }
  }, [activeFilters.timeframe]);

  // Fetch storm data from API
  const fetchStormData = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
        showToast("info", "Refreshing Data", "Fetching latest weather data...");
      } else {
        setIsLoading(true);
      }
      setFetchError(null);

      const params = new URLSearchParams();
      params.set("days", String(daysFromFilter));

      const response = await fetch(`/api/storms?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result: StormsApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Unknown error");
      }

      // Convert date strings to Date objects
      const events: StormEvent[] = result.data.events.map((e) => ({
        ...e,
        date: new Date(e.date),
        hailSize: e.hailSize ?? undefined,
        windSpeed: e.windSpeed ?? undefined,
      }));

      setStormEvents(events);
      setActiveAlerts(result.data.alerts);
      setStats(result.data.stats);
      setFilterOptions(result.data.filterOptions);

      if (showRefreshToast) {
        showToast("success", "Data Updated", "Weather data refreshed successfully");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch storm data";
      setFetchError(message);
      if (showRefreshToast) {
        showToast("error", "Refresh Failed", message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [daysFromFilter, showToast]);

  // Initial fetch and refetch when timeframe changes
  useEffect(() => {
    fetchStormData();
  }, [fetchStormData]);

  // Build filter config from real data
  const stormFilterConfig = useMemo(() => {
    if (!filterOptions) return defaultStormFilterConfig;

    return [
      {
        id: "type",
        label: "Storm Type",
        options: [
          { value: "hail", label: "Hail", count: filterOptions.types.find((t) => t.value === "hail")?.count || 0 },
          { value: "wind", label: "Wind", count: filterOptions.types.find((t) => t.value === "wind")?.count || 0 },
          { value: "thunderstorm", label: "Thunderstorm", count: filterOptions.types.find((t) => t.value === "thunderstorm")?.count || 0 },
          { value: "tornado", label: "Tornado", count: filterOptions.types.find((t) => t.value === "tornado")?.count || 0 },
        ],
        multiSelect: true,
      },
      {
        id: "severity",
        label: "Severity",
        options: [
          { value: "minor", label: "Minor", count: filterOptions.severities.find((s) => s.value === "minor")?.count || 0 },
          { value: "moderate", label: "Moderate", count: filterOptions.severities.find((s) => s.value === "moderate")?.count || 0 },
          { value: "severe", label: "Severe", count: filterOptions.severities.find((s) => s.value === "severe")?.count || 0 },
          { value: "catastrophic", label: "Catastrophic", count: filterOptions.severities.find((s) => s.value === "catastrophic")?.count || 0 },
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
        options: filterOptions.counties.map((c) => ({
          value: c.value,
          label: c.label,
          count: c.count,
        })),
        multiSelect: true,
      },
    ];
  }, [filterOptions]);

  // Client-side filter (type, severity, county applied locally; timeframe triggers refetch)
  const filteredEvents = useMemo(() => {
    return stormEvents.filter(event => {
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
  }, [stormEvents, activeFilters]);

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).reduce((acc, arr) => acc + arr.length, 0),
    [activeFilters]
  );

  // Memoized callbacks to prevent child re-renders
  const handleApplyFilters = useCallback((filters: Record<string, string[]>) => {
    setActiveFilters(filters);
    const filterCount = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0);
    if (filterCount > 0) {
      showToast("success", "Filters Applied", `${filterCount} filter(s) active`);
    }
  }, [showToast]);

  const handleRefresh = useCallback(async () => {
    await fetchStormData(true);
  }, [fetchStormData]);

  const handleOpenWeatherMap = useCallback(() => {
    window.open("https://www.weather.gov/", "_blank");
  }, []);

  const handleViewAffectedCustomers = useCallback((alertId: string, areas: string[]) => {
    showToast("info", "Loading Customers", `Finding customers in ${areas.join(", ")}...`);
    // Extract counties from areas (e.g., "Bucks County, PA" -> "Bucks")
    const counties = areas.map(area => {
      const match = area.match(/^([^,]+)\s+County/i);
      return match ? match[1] : area.split(",")[0].trim();
    });
    router.push(`/customers?filter=storm-affected&counties=${encodeURIComponent(counties.join(","))}&alertId=${alertId}`);
  }, [router, showToast]);

  const handleViewEventDetails = useCallback((event: StormEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  }, []);

  const handleOpenNOAA = useCallback(() => {
    window.open("https://www.ncdc.noaa.gov/stormevents/", "_blank");
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          <p className="text-text-muted">Loading storm intelligence...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError && stormEvents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Failed to load storm data</h3>
            <p className="text-text-muted mb-4">{fetchError}</p>
            <Button onClick={() => fetchStormData()}>
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
            Storm Intelligence
          </h1>
          <p className="text-text-muted">
            Real-time weather alerts and storm damage opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={handleOpenWeatherMap}>
            <ExternalLink className="w-4 h-4" />
            Weather Map
          </Button>
        </div>
      </div>

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
                            Until {new Date(alert.expires).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
          value={formatCurrency(stats.totalOpportunity)}
          change={23}
          changeLabel="vs previous quarter"
          trend="up"
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Affected Customers"
          value={stats.totalAffected}
          change={15}
          changeLabel="new this month"
          trend="up"
          icon={Users}
          variant="primary"
        />
        <MetricCard
          title="Inspections Pending"
          value={stats.totalPending}
          icon={Calendar}
          variant="accent"
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts.length}
          icon={AlertTriangle}
          variant="danger"
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
            markers={filteredEvents
              .filter(event => event.latitude && event.longitude)
              .map(event => ({
                id: event.id,
                lat: event.latitude!,
                lon: event.longitude!,
                type: event.type as "hail" | "wind",
                label: `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} Event - ${event.location}`,
                severity: event.severity === "catastrophic" ? "critical" as const
                  : event.severity === "severe" ? "high" as const
                  : event.severity === "moderate" ? "moderate" as const
                  : "low" as const,
                details: event.hailSize
                  ? `${event.hailSize}" hail - ${event.affectedCustomers} customers affected`
                  : `${event.windSpeed} mph winds - ${event.affectedCustomers} customers affected`,
              }))}
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
                            <Badge variant="secondary">{event.hailSize}&quot; Hail</Badge>
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
                          <WeatherPreview latitude={event.latitude} longitude={event.longitude} />
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

      {/* Filter Modal - Lazy loaded */}
      {showFilterModal && (
        <LazyFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          title="Filter Storm Events"
          filters={stormFilterConfig}
          activeFilters={activeFilters}
          onApply={handleApplyFilters}
        />
      )}

      {/* Storm Details Modal - Lazy loaded */}
      {showDetailsModal && (
        <LazyStormDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          event={selectedEvent}
        />
      )}
    </motion.div>
  );
}
