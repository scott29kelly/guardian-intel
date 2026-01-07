"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { formatCurrency } from "@/lib/utils";

// Mock storm data
const activeAlerts = [
  {
    id: "alert-1",
    type: "hail",
    severity: "severe",
    headline: "Severe Thunderstorm Warning",
    description: "Large hail up to 1.5 inches expected. Damaging winds up to 60 mph possible.",
    areas: ["Franklin County", "Delaware County"],
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
    areas: ["Licking County"],
    onset: new Date("2026-01-07T16:00:00"),
    expires: new Date("2026-01-08T06:00:00"),
    affectedCustomers: 8,
    estimatedOpportunity: 120000,
  },
];

const recentStormEvents = [
  {
    id: "event-1",
    type: "hail",
    date: new Date("2026-01-02"),
    location: "Columbus, OH",
    county: "Franklin",
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
    location: "Westerville, OH",
    county: "Delaware",
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
    location: "Dublin, OH",
    county: "Franklin",
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
    location: "Powell, OH",
    county: "Delaware",
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

const severityColors: Record<string, string> = {
  minor: "bg-guardian-500/20 text-guardian-400 border-guardian-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  severe: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  catastrophic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function StormsPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const totalOpportunity = recentStormEvents.reduce((sum, e) => sum + e.opportunity, 0);
  const totalAffected = recentStormEvents.reduce((sum, e) => sum + e.affectedCustomers, 0);
  const totalPending = recentStormEvents.reduce((sum, e) => sum + e.inspectionsPending, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Storm Intelligence
          </h1>
          <p className="text-surface-400">
            Real-time weather alerts and storm damage opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
          <Button>
            <ExternalLink className="w-4 h-4" />
            Open Weather Map
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
            <h2 className="font-display text-xl font-bold text-white">
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
                            <h3 className="font-semibold text-white">{alert.headline}</h3>
                            <p className="text-sm text-surface-400 mt-1">{alert.description}</p>
                          </div>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                          <span className="flex items-center gap-1 text-surface-300">
                            <MapPin className="w-4 h-4" />
                            {alert.areas.join(", ")}
                          </span>
                          <span className="flex items-center gap-1 text-surface-300">
                            <Calendar className="w-4 h-4" />
                            Until {alert.expires.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="flex items-center gap-1 text-surface-300">
                            <Users className="w-4 h-4" />
                            {alert.affectedCustomers} customers in area
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-500/20">
                          <div>
                            <span className="text-sm text-surface-400">Estimated Opportunity:</span>
                            <span className="ml-2 text-lg font-bold text-emerald-400">
                              {formatCurrency(alert.estimatedOpportunity)}
                            </span>
                          </div>
                          <Button size="sm">
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

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-guardian-400" />
            Storm Event Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-surface-800/50 rounded-lg flex items-center justify-center border border-surface-700/50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400 mb-2">Interactive Map</p>
              <p className="text-sm text-surface-500">
                Integration with mapping service (Google Maps, Mapbox) coming soon
              </p>
              <Button variant="outline" className="mt-4">
                <ExternalLink className="w-4 h-4" />
                Open in NOAA Storm Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Storm Events */}
      <div>
        <h2 className="font-display text-xl font-bold text-white mb-4">
          Recent Storm Events
        </h2>
        
        <div className="space-y-4">
          {recentStormEvents.map((event, index) => {
            const Icon = stormTypeIcons[event.type] || CloudLightning;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedEvent === event.id ? "glow-primary" : "hover:bg-surface-800/30"
                  }`}
                  onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
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
                          <h3 className="font-semibold text-white capitalize">
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
                        <div className="flex items-center gap-4 mt-1 text-sm text-surface-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location} ({event.county} County)
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {event.date.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="hidden lg:flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{event.affectedCustomers}</p>
                          <p className="text-xs text-surface-400">Affected</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-400">{event.inspectionsPending}</p>
                          <p className="text-xs text-surface-400">Pending</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-400">{event.claimsFiled}</p>
                          <p className="text-xs text-surface-400">Claims</p>
                        </div>
                        <div className="text-center pl-4 border-l border-surface-700">
                          <p className="text-2xl font-bold text-white">{formatCurrency(event.opportunity)}</p>
                          <p className="text-xs text-surface-400">Opportunity</p>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    {/* Mobile stats */}
                    <div className="lg:hidden grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-surface-700/50">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{event.affectedCustomers}</p>
                        <p className="text-xs text-surface-400">Affected</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-400">{event.inspectionsPending}</p>
                        <p className="text-xs text-surface-400">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-emerald-400">{event.claimsFiled}</p>
                        <p className="text-xs text-surface-400">Claims</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{formatCurrency(event.opportunity)}</p>
                        <p className="text-xs text-surface-400">Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
