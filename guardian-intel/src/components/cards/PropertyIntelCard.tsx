import { 
  Home, 
  Calendar, 
  Ruler, 
  Sun, 
  Layers, 
  Flame,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { PropertyIntel } from '../../types';
import { formatCurrency, formatNumber, formatDate, getRoofMaterialLabel, getRoofTypeLabel } from '../../lib/utils';

interface PropertyIntelCardProps {
  property: PropertyIntel;
  compact?: boolean;
}

export function PropertyIntelCard({ property, compact = false }: PropertyIntelCardProps) {
  const roofAgeStatus = property.estimatedRoofAge >= 20 
    ? 'danger' 
    : property.estimatedRoofAge >= 15 
      ? 'warning' 
      : 'success';

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-guardian-800">
              <img 
                src={property.aerialImageUrl} 
                alt="Aerial view"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-1 left-1 right-1">
                <span className="text-[10px] font-medium text-white/90">Aerial</span>
              </div>
            </div>
            
            {/* Key Stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-guardian-400 truncate">{property.address}</p>
                <Badge variant={roofAgeStatus} size="sm">{property.estimatedRoofAge} yrs</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3 h-3 text-guardian-500" />
                  <span className="text-xs text-guardian-300">{formatNumber(property.roofSquareFootage)} sq ft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-guardian-500" />
                  <span className="text-xs text-guardian-300">{getRoofMaterialLabel(property.roofMaterial)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Home className="w-3 h-3 text-guardian-500" />
                  <span className="text-xs text-guardian-300">{property.stories} story</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-guardian-500" />
                  <span className="text-xs text-guardian-300">Built {property.yearBuilt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Home className="w-4 h-4" />}>Property Intelligence</CardTitle>
        <Badge variant={roofAgeStatus}>Roof Age: {property.estimatedRoofAge} yrs</Badge>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Aerial Image */}
        <div className="relative h-40 overflow-hidden">
          <img 
            src={property.aerialImageUrl} 
            alt="Aerial view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-guardian-900 via-transparent to-transparent" />
          
          {/* Address overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4 className="text-base font-semibold text-white">{property.address}</h4>
            <p className="text-xs text-guardian-300">{property.city}, {property.state} {property.zipCode}</p>
          </div>
          
          {/* Feature badges */}
          <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end max-w-[60%]">
            {property.hasSolarPanels && (
              <Badge variant="warning" size="sm">
                <Sun className="w-3 h-3 mr-1" /> Solar
              </Badge>
            )}
            {property.hasSkylights && (
              <Badge variant="info" size="sm">
                {property.skylightCount} Skylights
              </Badge>
            )}
            {property.hasChimney && (
              <Badge variant="outline" size="sm">
                <Flame className="w-3 h-3 mr-1" /> Chimney
              </Badge>
            )}
          </div>
        </div>

        {/* Property Details Grid */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DataItem 
              icon={<Ruler className="w-4 h-4" />}
              label="Roof Size"
              value={`${formatNumber(property.roofSquareFootage)} sq ft`}
            />
            <DataItem 
              icon={<Layers className="w-4 h-4" />}
              label="Material"
              value={getRoofMaterialLabel(property.roofMaterial)}
            />
            <DataItem 
              icon={<Home className="w-4 h-4" />}
              label="Style"
              value={`${getRoofTypeLabel(property.roofType)} / ${property.stories}-Story`}
            />
            <DataItem 
              icon={<Calendar className="w-4 h-4" />}
              label="Year Built"
              value={property.yearBuilt.toString()}
            />
          </div>

          {/* Estimated Values */}
          <div className="pt-3 border-t border-guardian-800">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-guardian-500 mb-0.5">Est. Property Value</p>
                <p className="text-sm font-semibold text-guardian-200">{formatCurrency(property.estimatedPropertyValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-guardian-500 mb-0.5">Est. Roof Value</p>
                <p className="text-sm font-semibold text-storm-400">{formatCurrency(property.estimatedRoofValue)}</p>
              </div>
            </div>
          </div>

          {/* Last Known Work */}
          {property.lastRoofWork && (
            <div className="pt-3 border-t border-guardian-800">
              <div className="flex items-start gap-3 p-3 bg-guardian-800/50 rounded-lg">
                <FileText className="w-4 h-4 text-guardian-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-guardian-300">Last Known Roof Work</p>
                  <p className="text-xs text-guardian-400 mt-0.5">
                    {property.lastRoofWork.type.charAt(0).toUpperCase() + property.lastRoofWork.type.slice(1)} on {formatDate(property.lastRoofWork.date)}
                  </p>
                  {property.lastRoofWork.permitNumber && (
                    <p className="text-[10px] text-guardian-500 mt-1">
                      Permit: {property.lastRoofWork.permitNumber}
                    </p>
                  )}
                </div>
                <ArrowUpRight className="w-4 h-4 text-guardian-600" />
              </div>
            </div>
          )}

          {/* Key Insight */}
          <div className="p-3 bg-storm-500/10 border border-storm-500/20 rounded-lg">
            <p className="text-xs text-storm-300">
              <span className="font-semibold">💡 Talking Point:</span> "Your roof is likely {property.estimatedRoofAge}+ years old - right in the replacement window for asphalt shingles."
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DataItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-guardian-500">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-guardian-500">{label}</p>
        <p className="text-sm font-medium text-guardian-200">{value}</p>
      </div>
    </div>
  );
}
