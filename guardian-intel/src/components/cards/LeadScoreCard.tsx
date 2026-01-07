import { 
  TrendingUp, 
  Zap,
  Target,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress, ScoreRing } from '../ui/Progress';
import type { LeadScore } from '../../types';
import { getRecommendationLabel } from '../../lib/utils';

interface LeadScoreCardProps {
  score: LeadScore;
  compact?: boolean;
}

export function LeadScoreCard({ score, compact = false }: LeadScoreCardProps) {
  const { overall, factors, recommendation, insights } = score;

  const recommendationColors = {
    hot: 'danger',
    warm: 'warning',
    cold: 'info',
  } as const;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-guardian-900 to-guardian-800 border-guardian-700">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScoreRing value={overall} size={56} strokeWidth={4} />
              <div>
                <p className="text-xs text-guardian-400">Lead Score</p>
                <p className="text-sm font-semibold text-guardian-100">
                  {getRecommendationLabel(recommendation)}
                </p>
              </div>
            </div>
            <Badge variant={recommendationColors[recommendation]}>
              <Zap className="w-3 h-3 mr-1" />
              {recommendation.toUpperCase()}
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-guardian-900 via-guardian-900 to-guardian-800 border-guardian-700">
      <CardHeader>
        <CardTitle icon={<Target className="w-4 h-4" />}>Lead Score</CardTitle>
        <Badge variant={recommendationColors[recommendation]} className="gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          {getRecommendationLabel(recommendation)}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Overall Score */}
        <div className="flex items-center justify-center py-4">
          <div className="relative">
            <ScoreRing value={overall} size={120} strokeWidth={8} />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <Badge variant={recommendationColors[recommendation]} size="sm">
                {recommendation.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Score Factors */}
        <div>
          <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider mb-3">
            Score Breakdown
          </h4>
          <div className="space-y-3">
            <ScoreFactor label="Roof Age" value={factors.roofAge} icon="🏠" />
            <ScoreFactor label="Storm Exposure" value={factors.stormExposure} icon="⛈️" />
            <ScoreFactor label="Insurance Coverage" value={factors.insuranceCoverage} icon="🛡️" />
            <ScoreFactor label="Engagement History" value={factors.engagementHistory} icon="💬" />
            <ScoreFactor label="Neighborhood Activity" value={factors.neighborhoodActivity} icon="📍" />
          </div>
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-storm-400" />
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Key Insights
            </h4>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 p-2.5 bg-storm-500/10 border border-storm-500/20 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-storm-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-storm-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreFactor({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-guardian-300">{label}</span>
          <span className="text-xs font-medium text-guardian-200">{value}</span>
        </div>
        <Progress value={value} size="sm" variant="score" />
      </div>
    </div>
  );
}
