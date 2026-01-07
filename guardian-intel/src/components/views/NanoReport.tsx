import { 
  Zap, 
  ChevronRight, 
  Phone,
  Navigation,
  Clock,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ScoreRing } from '../ui/Progress';
import { StormHistoryCard, NeighborhoodCard, InsuranceIntelCard } from '../cards';
import type { Lead } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface NanoReportProps {
  lead: Lead;
  onViewFull: () => void;
}

export function NanoReport({ lead, onViewFull }: NanoReportProps) {
  const { property, stormHistory, neighborhood, insurance, score, conversationPrep, customerName } = lead;
  
  const topTalkingPoints = conversationPrep.keyTalkingPoints.slice(0, 3);
  const bestInsight = score.insights[0];

  return (
    <div className="min-h-screen bg-guardian-950">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-50 bg-guardian-950/95 backdrop-blur-sm border-b border-guardian-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing value={score.overall} size={44} strokeWidth={4} />
              <div>
                <h1 className="text-sm font-semibold text-guardian-100 line-clamp-1">{customerName}</h1>
                <p className="text-xs text-guardian-400 line-clamp-1">{property.address}</p>
              </div>
            </div>
            <Badge 
              variant={score.recommendation === 'hot' ? 'danger' : score.recommendation === 'warm' ? 'warning' : 'info'}
              className="flex-shrink-0"
            >
              <Zap className="w-3 h-3 mr-1" />
              {score.recommendation.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 pb-28">
        {/* Property Thumbnail + Key Stats */}
        <div className="relative rounded-2xl overflow-hidden">
          <img 
            src={property.aerialImageUrl} 
            alt="Property"
            className="w-full h-36 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-guardian-950 via-guardian-950/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-guardian-400 uppercase tracking-wider">Est. Roof Value</p>
                <p className="text-xl font-bold text-guardian-100">{formatCurrency(property.estimatedRoofValue)}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{property.estimatedRoofAge} yr roof</Badge>
                <Badge variant={stormHistory.riskScore >= 70 ? 'danger' : 'warning'}>
                  {stormHistory.riskScore}% damage prob
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Key Talking Points */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-semibold text-guardian-100">Quick Talking Points</h2>
            </div>
            <div className="space-y-2">
              {topTalkingPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-storm-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-storm-400">{index + 1}</span>
                  </span>
                  <p className="text-xs text-guardian-300 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Did You Know - Key Insight */}
        <Card className="bg-storm-500/10 border-storm-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-storm-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-storm-400" />
              </div>
              <div>
                <p className="text-[10px] text-storm-400 uppercase tracking-wider mb-1">Did You Know</p>
                <p className="text-sm text-guardian-200">{bestInsight}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <StormHistoryCard stormHistory={stormHistory} compact />
            <NeighborhoodCard neighborhood={neighborhood} compact />
          </div>
          <div className="space-y-3">
            <InsuranceIntelCard insurance={insurance} compact />
            <Card>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-storm-400" />
                  <span className="text-sm font-medium text-guardian-200">Status</span>
                </div>
                <Badge variant="info" className="w-full justify-center py-1.5">
                  {lead.status.replace('-', ' ').toUpperCase()}
                </Badge>
                {lead.appointmentDate && (
                  <p className="text-[10px] text-guardian-500 mt-2 text-center">
                    {lead.appointmentDate} at {lead.appointmentTime}
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* View Full Brief Button */}
        <button
          onClick={onViewFull}
          className="w-full flex items-center justify-between p-4 bg-guardian-800/50 hover:bg-guardian-800 rounded-xl border border-guardian-700 transition-colors"
        >
          <span className="text-sm font-medium text-guardian-200">View Full Brief</span>
          <ChevronRight className="w-5 h-5 text-guardian-500" />
        </button>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-guardian-900/95 backdrop-blur-sm border-t border-guardian-800 p-4">
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            size="lg" 
            className="flex-1"
            leftIcon={<Phone className="w-4 h-4" />}
          >
            Call
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            className="flex-1"
            leftIcon={<Navigation className="w-4 h-4" />}
          >
            Navigate
          </Button>
        </div>
      </div>
    </div>
  );
}
