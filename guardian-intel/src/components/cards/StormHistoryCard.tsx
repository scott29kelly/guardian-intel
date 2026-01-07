import { 
  CloudRain, 
  Wind, 
  AlertTriangle,
  Clock,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress, ScoreRing } from '../ui/Progress';
import type { StormHistory, StormEvent } from '../../types';
import { formatDate, formatRelativeDate, getSeverityColor } from '../../lib/utils';

interface StormHistoryCardProps {
  stormHistory: StormHistory;
  compact?: boolean;
}

export function StormHistoryCard({ stormHistory, compact = false }: StormHistoryCardProps) {
  const { recentEvents, riskScore, lastSignificantEvent, inHighImpactZone } = stormHistory;

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-storm-400" />
              <span className="text-sm font-medium text-guardian-200">Storm Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${riskScore >= 70 ? 'bg-danger' : riskScore >= 40 ? 'bg-warning' : 'bg-success'}`} />
              <span className="text-sm font-bold text-guardian-100">{riskScore}%</span>
            </div>
          </div>
          
          {lastSignificantEvent && (
            <div className="flex items-center justify-between p-2.5 bg-guardian-800/50 rounded-lg">
              <div>
                <p className="text-xs font-medium text-guardian-300">
                  {lastSignificantEvent.hailSize 
                    ? `${lastSignificantEvent.hailSize}" Hail` 
                    : `${lastSignificantEvent.windSpeed} mph Wind`}
                </p>
                <p className="text-[10px] text-guardian-500">{formatDate(lastSignificantEvent.date)}</p>
              </div>
              <Badge variant={lastSignificantEvent.severity === 'severe' || lastSignificantEvent.severity === 'extreme' ? 'danger' : 'warning'} size="sm">
                {lastSignificantEvent.damageProbability}% Damage
              </Badge>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<CloudRain className="w-4 h-4" />}>Storm History</CardTitle>
        {inHighImpactZone && (
          <Badge variant="danger">
            <AlertTriangle className="w-3 h-3 mr-1" /> High Impact Zone
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="flex items-center justify-between p-4 bg-guardian-800/50 rounded-xl">
          <div>
            <h4 className="text-sm font-medium text-guardian-200 mb-1">Damage Probability</h4>
            <p className="text-xs text-guardian-400">Based on recent storm activity</p>
          </div>
          <ScoreRing value={riskScore} size={70} strokeWidth={5} />
        </div>

        {/* Last Significant Event Highlight */}
        {lastSignificantEvent && (
          <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-danger/20 rounded-lg">
                {lastSignificantEvent.type === 'hail' ? (
                  <Zap className="w-5 h-5 text-danger" />
                ) : (
                  <Wind className="w-5 h-5 text-danger" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-guardian-100">
                    {lastSignificantEvent.type === 'hail' 
                      ? `${lastSignificantEvent.hailSize}" Hail Event`
                      : `${lastSignificantEvent.windSpeed} mph Wind Event`}
                  </h4>
                  <Badge variant="danger" size="sm">
                    {lastSignificantEvent.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-guardian-400 mt-1">
                  {formatDate(lastSignificantEvent.date)} • {lastSignificantEvent.damageProbability}% damage probability
                </p>
                
                {lastSignificantEvent.claimDeadline && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-guardian-900/50 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    <span className="text-xs text-warning">
                      Claim deadline: {formatDate(lastSignificantEvent.claimDeadline)}
                      {lastSignificantEvent.daysUntilDeadline && (
                        <span className="text-guardian-400"> ({lastSignificantEvent.daysUntilDeadline} days)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Storm Timeline */}
        <div>
          <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider mb-3">Recent Events</h4>
          <div className="space-y-2">
            {recentEvents.slice(0, 4).map((event, index) => (
              <StormEventRow key={event.id} event={event} isFirst={index === 0} />
            ))}
          </div>
        </div>

        {/* Talking Point */}
        {lastSignificantEvent && (
          <div className="p-3 bg-storm-500/10 border border-storm-500/20 rounded-lg">
            <p className="text-xs text-storm-300">
              <span className="font-semibold">💡 Opener:</span> "I see you had {lastSignificantEvent.hailSize ? `${lastSignificantEvent.hailSize}" hail` : 'significant wind'} come through on {formatDate(lastSignificantEvent.date)} - have you noticed any issues since then?"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StormEventRow({ event, isFirst }: { event: StormEvent; isFirst: boolean }) {
  const getIcon = () => {
    switch (event.type) {
      case 'hail': return <Zap className="w-3.5 h-3.5" />;
      case 'wind': return <Wind className="w-3.5 h-3.5" />;
      case 'tornado': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return <CloudRain className="w-3.5 h-3.5" />;
    }
  };

  const getEventDetails = () => {
    if (event.hailSize) return `${event.hailSize}" hail`;
    if (event.windSpeed) return `${event.windSpeed} mph`;
    return event.type;
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg ${isFirst ? 'bg-guardian-800/70' : 'bg-guardian-800/30'} hover:bg-guardian-800/50 transition-colors cursor-pointer`}>
      <div className={`p-1.5 rounded-md ${getSeverityBgColor(event.severity)}`}>
        <span className={getSeverityColor(event.severity)}>{getIcon()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-guardian-200">{getEventDetails()}</p>
        <p className="text-[10px] text-guardian-500">{formatRelativeDate(event.date)}</p>
      </div>
      <div className="text-right">
        <Progress value={event.damageProbability} size="sm" variant="score" className="w-16" />
        <p className="text-[10px] text-guardian-500 mt-0.5">{event.damageProbability}%</p>
      </div>
      <ChevronRight className="w-4 h-4 text-guardian-600" />
    </div>
  );
}

function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'extreme':
    case 'severe': return 'bg-danger/20';
    case 'moderate': return 'bg-warning/20';
    case 'minor': return 'bg-success/20';
    default: return 'bg-guardian-700';
  }
}
