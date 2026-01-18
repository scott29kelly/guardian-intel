'use client';

import { useState, useEffect } from 'react';
import { MapPin, CloudLightning, FileCheck, Building, Filter, Layers, ZoomIn } from 'lucide-react';
import { terrainData } from '@/lib/terrain/data-provider';
import { StormEvent, PermitRecord, MarketIndicator } from '@/lib/terrain/types';
import { GUARDIAN_OFFICES, TERRITORY_COUNTIES, SEVERITY_CONFIG } from '@/lib/terrain/constants';
import { MARKET_TEMPERATURE_CONFIG } from '@/lib/terrain/generators/market-generator';
import Link from 'next/link';
import { format } from 'date-fns';

type MapLayer = 'storms' | 'permits' | 'markets' | 'offices';

export default function TerritoryMapPage() {
  const [storms, setStorms] = useState<StormEvent[]>([]);
  const [markets, setMarkets] = useState<MarketIndicator[]>([]);
  const [activeLayers, setActiveLayers] = useState<MapLayer[]>(['storms', 'offices']);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    terrainData.initialize();
    setStorms(terrainData.getRecentStormEvents(30));
    setMarkets(terrainData.getMarketIndicators());
    setIsLoading(false);
  }, []);
  
  const toggleLayer = (layer: MapLayer) => {
    setActiveLayers(prev => 
      prev.includes(layer) 
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };
  
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-surface-secondary rounded" />
        <div className="h-[600px] bg-surface-secondary rounded-lg" />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link href="/terrain" className="hover:text-text-secondary transition-colors">
              Trade Terrain
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Territory Map</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Territory Visualization</h1>
          <p className="text-text-muted mt-1">Geographic view of storm activity, market conditions, and opportunities</p>
        </div>
      </div>
      
      {/* Layer Controls */}
      <div className="glass-panel p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-muted">Layers:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleLayer('storms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeLayers.includes('storms')
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-surface-secondary text-text-muted hover:text-text-secondary border border-border'
            }`}
          >
            <CloudLightning className="w-3.5 h-3.5" />
            Storm Events ({storms.length})
          </button>
          <button
            onClick={() => toggleLayer('markets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeLayers.includes('markets')
                ? 'bg-intel-500/10 text-intel-400 border border-intel-500/30'
                : 'bg-surface-secondary text-text-muted hover:text-text-secondary border border-border'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Market Conditions
          </button>
          <button
            onClick={() => toggleLayer('offices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeLayers.includes('offices')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-surface-secondary text-text-muted hover:text-text-secondary border border-border'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Guardian Offices
          </button>
        </div>
      </div>
      
      {/* Map Placeholder */}
      <div className="glass-panel overflow-hidden">
        <div className="relative h-[600px] bg-[#0d1117] overflow-hidden">
          {/* Map placeholder graphic */}
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 800 600" className="w-full h-full">
              {/* State outlines - simplified */}
              <path d="M200,100 L400,80 L450,150 L420,250 L350,280 L250,250 L180,180 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
              <path d="M400,80 L550,100 L580,180 L520,250 L450,150 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
              <path d="M180,180 L250,250 L280,350 L200,380 L120,320 L140,230 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
              <path d="M250,250 L350,280 L380,380 L320,420 L280,350 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
              <path d="M350,280 L420,250 L480,320 L440,400 L380,380 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
              <path d="M420,250 L520,250 L560,350 L480,320 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-intel-400" />
            </svg>
          </div>
          
          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <ZoomIn className="w-16 h-16 text-intel-400 opacity-30 mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">Interactive Map</h3>
            <p className="text-text-muted max-w-md mb-6">
              Interactive Mapbox visualization with storm event markers, 
              permit activity heatmaps, and market temperature overlays coming soon.
            </p>
            <p className="text-sm text-text-muted">
              Guardian Territory covers 6 states across the Mid-Atlantic region
            </p>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 glass-panel p-3 bg-black/60 backdrop-blur-md">
            <h4 className="text-xs font-semibold text-text-primary mb-2">Legend</h4>
            <div className="space-y-1.5">
              {activeLayers.includes('storms') && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-text-muted">Storm Event</span>
                  </div>
                </>
              )}
              {activeLayers.includes('markets') && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-text-muted">Hot Market</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-text-muted">Cool Market</span>
                  </div>
                </>
              )}
              {activeLayers.includes('offices') && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-text-muted">Guardian Office</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storm Events Table */}
        {activeLayers.includes('storms') && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <CloudLightning className="w-4 h-4 text-amber-400" />
                Recent Storm Events (30 days)
              </h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary sticky top-0">
                  <tr className="text-left text-text-muted">
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {storms.slice(0, 10).map((storm) => {
                    const severityConfig = SEVERITY_CONFIG[storm.severity] || SEVERITY_CONFIG.minor;
                    return (
                      <tr key={storm.id} className="hover:bg-surface-secondary/50">
                        <td className="p-3 text-text-primary">
                          {storm.location.county}, {storm.location.state}
                        </td>
                        <td className="p-3 text-text-secondary capitalize">
                          {storm.eventType.replace(/_/g, ' ')}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${severityConfig.bgColor} ${severityConfig.color}`}>
                            {severityConfig.label}
                          </span>
                        </td>
                        <td className="p-3 text-text-muted">
                          {format(storm.occurredAt, 'MMM d')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Market Conditions Table */}
        {activeLayers.includes('markets') && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Building className="w-4 h-4 text-intel-400" />
                Market Conditions by County
              </h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary sticky top-0">
                  <tr className="text-left text-text-muted">
                    <th className="p-3 font-medium">County</th>
                    <th className="p-3 font-medium">Temperature</th>
                    <th className="p-3 font-medium">Value Change</th>
                    <th className="p-3 font-medium">Days on Market</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {markets.slice(0, 10).map((market) => {
                    const tempConfig = MARKET_TEMPERATURE_CONFIG[market.marketTemperature];
                    return (
                      <tr key={market.id} className="hover:bg-surface-secondary/50">
                        <td className="p-3 text-text-primary">
                          {market.county}, {market.state}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${tempConfig.bgColor} ${tempConfig.color}`}>
                            {tempConfig.label}
                          </span>
                        </td>
                        <td className={`p-3 ${market.valueChangeYoY > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {market.valueChangeYoY > 0 ? '+' : ''}{market.valueChangeYoY}%
                        </td>
                        <td className="p-3 text-text-muted">
                          {market.averageDaysOnMarket}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Guardian Offices */}
        {activeLayers.includes('offices') && (
          <div className="glass-panel overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Guardian Office Locations
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {Object.entries(GUARDIAN_OFFICES).map(([key, office]) => (
                <div key={key} className="bg-surface-secondary rounded-lg p-4 border border-border">
                  <h4 className="font-medium text-text-primary">{office.name}</h4>
                  <p className="text-sm text-text-muted mt-1">{office.address}</p>
                  <p className="text-sm text-intel-400 mt-2">{office.phone}</p>
                  <p className="text-xs text-text-muted mt-2">
                    Territory: {office.primaryTerritory.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
