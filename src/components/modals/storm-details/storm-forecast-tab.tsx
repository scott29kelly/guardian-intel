"use client";

import {
  Calendar,
  Clock,
  Wind,
  Thermometer,
  Droplets,
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  Sun,
  ExternalLink,
  Radio,
  CloudLightning,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForecastData, StormEvent } from "./types";

interface StormForecastTabProps {
  event: StormEvent;
  forecast: ForecastData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenNWSForecast: () => void;
  onOpenNWSRadar: () => void;
  onOpenNOAAStormEvents: () => void;
}

function getWeatherIcon(forecast: string) {
  const lower = forecast.toLowerCase();
  if (lower.includes("snow") || lower.includes("flurr")) return CloudSnow;
  if (lower.includes("rain") || lower.includes("shower")) return CloudRain;
  if (lower.includes("thunder") || lower.includes("storm")) return Zap;
  if (lower.includes("cloud") || lower.includes("overcast")) return Cloud;
  if (lower.includes("wind")) return Wind;
  return Sun;
}

export function StormForecastTab({
  event,
  forecast,
  isLoading,
  error,
  onRetry,
  onOpenNWSForecast,
  onOpenNWSRadar,
  onOpenNOAAStormEvents,
}: StormForecastTabProps) {
  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
        <p className="text-text-muted">Loading weather data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <Cloud className="w-12 h-12 text-text-muted mb-3" />
        <p className="text-text-muted mb-4">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <Cloud className="w-12 h-12 text-text-muted mb-3" />
        <p className="text-text-muted mb-4">No forecast data available</p>
        <Button variant="outline" onClick={onRetry}>
          Load Forecast
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
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
        <Button variant="outline" size="sm" onClick={onOpenNWSForecast}>
          <ExternalLink className="w-4 h-4" />
          NWS Forecast
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenNWSRadar}>
          <Radio className="w-4 h-4" />
          Live Radar
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenNOAAStormEvents}>
          <CloudLightning className="w-4 h-4" />
          NOAA Storm History
        </Button>
      </div>
    </div>
  );
}
