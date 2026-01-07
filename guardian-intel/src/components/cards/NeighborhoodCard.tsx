import { 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { NeighborhoodContext, NeighborhoodProject, CompetitorSighting } from '../../types';
import { formatRelativeDate } from '../../lib/utils';

interface NeighborhoodCardProps {
  neighborhood: NeighborhoodContext;
  compact?: boolean;
}

export function NeighborhoodCard({ neighborhood, compact = false }: NeighborhoodCardProps) {
  const { guardianProjects, activeClaims, competitorSightings, averageRoofAge, recentStormDamage } = neighborhood;
  
  const referenceableProjects = guardianProjects.filter(p => p.canReference);

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-storm-400" />
              <span className="text-sm font-medium text-guardian-200">Neighborhood</span>
            </div>
            <Badge variant="success" size="sm">
              {guardianProjects.length} Projects
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-guardian-800/50 rounded-lg">
              <p className="text-lg font-bold text-guardian-100">{activeClaims}</p>
              <p className="text-[10px] text-guardian-500">Active Claims</p>
            </div>
            <div className="p-2.5 bg-guardian-800/50 rounded-lg">
              <p className="text-lg font-bold text-guardian-100">{averageRoofAge} yrs</p>
              <p className="text-[10px] text-guardian-500">Avg Roof Age</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<MapPin className="w-4 h-4" />}>Neighborhood Context</CardTitle>
        {recentStormDamage && (
          <Badge variant="warning">Recent Storm Activity</Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox 
            value={guardianProjects.length}
            label="Guardian Projects"
            variant="success"
          />
          <StatBox 
            value={activeClaims}
            label="Active Claims"
            variant="info"
          />
          <StatBox 
            value={`${averageRoofAge} yrs`}
            label="Avg Roof Age"
            variant="default"
          />
        </div>

        {/* Guardian Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Nearby Guardian Projects
            </h4>
            <span className="text-[10px] text-storm-400">{referenceableProjects.length} can reference</span>
          </div>
          
          <div className="space-y-2">
            {guardianProjects.slice(0, 3).map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Competitor Intel */}
        {competitorSightings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
              <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
                Competitor Activity
              </h4>
            </div>
            
            <div className="space-y-2">
              {competitorSightings.map((sighting) => (
                <CompetitorRow key={sighting.id} sighting={sighting} />
              ))}
            </div>
          </div>
        )}

        {/* Reference Talking Point */}
        {referenceableProjects.length > 0 && (
          <div className="p-3 bg-storm-500/10 border border-storm-500/20 rounded-lg">
            <p className="text-xs text-storm-300">
              <span className="font-semibold">💡 Social Proof:</span> "We just finished your neighbor's roof at {referenceableProjects[0].address} - happy to give you their number as a reference."
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ value, label, variant }: { value: string | number; label: string; variant: 'success' | 'info' | 'default' }) {
  const bgColors = {
    success: 'bg-success/10 border-success/20',
    info: 'bg-info/10 border-info/20',
    default: 'bg-guardian-800/50 border-guardian-700/30',
  };
  
  const textColors = {
    success: 'text-success',
    info: 'text-info',
    default: 'text-guardian-200',
  };

  return (
    <div className={`p-3 rounded-xl border ${bgColors[variant]} text-center`}>
      <p className={`text-xl font-bold ${textColors[variant]}`}>{value}</p>
      <p className="text-[10px] text-guardian-500 mt-0.5">{label}</p>
    </div>
  );
}

function ProjectRow({ project }: { project: NeighborhoodProject }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-guardian-800/30 rounded-lg hover:bg-guardian-800/50 transition-colors cursor-pointer">
      {project.afterImageUrl ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-guardian-700 flex-shrink-0">
          <img src={project.afterImageUrl} alt="Project" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-guardian-700 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-success" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-guardian-200 truncate">{project.address}</p>
          {project.canReference && (
            <Badge variant="success" size="sm">Ref OK</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-guardian-500">{Math.round(project.distance)} ft away</span>
          <span className="text-guardian-700">•</span>
          <span className="text-[10px] text-guardian-500">{project.projectType}</span>
          {project.customerRating && (
            <>
              <span className="text-guardian-700">•</span>
              <span className="flex items-center gap-0.5 text-[10px] text-warning">
                <Star className="w-2.5 h-2.5 fill-current" /> {project.customerRating}
              </span>
            </>
          )}
        </div>
      </div>
      
      <ChevronRight className="w-4 h-4 text-guardian-600" />
    </div>
  );
}

function CompetitorRow({ sighting }: { sighting: CompetitorSighting }) {
  const typeLabels = {
    'yard-sign': '🪧 Yard Sign',
    'truck': '🚛 Truck',
    'active-work': '🔨 Active Work',
  };

  return (
    <div className="flex items-center gap-3 p-2.5 bg-warning/5 border border-warning/10 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-guardian-200">{sighting.companyName}</p>
          <Badge variant="outline" size="sm">{typeLabels[sighting.type]}</Badge>
        </div>
        <p className="text-[10px] text-guardian-500 mt-0.5">
          {sighting.address} • {formatRelativeDate(sighting.spottedDate)}
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-guardian-600" />
    </div>
  );
}
