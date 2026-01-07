import { 
  ArrowLeft,
  Phone,
  Navigation,
  Mail,
  MoreVertical
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ScoreRing } from '../ui/Progress';
import { 
  PropertyIntelCard, 
  StormHistoryCard, 
  NeighborhoodCard, 
  CustomerHistoryCard,
  InsuranceIntelCard, 
  ConversationPrepCard,
  LeadScoreCard
} from '../cards';
import { BeforeAfterSlider } from '../ui/BeforeAfterSlider';
import type { Lead } from '../../types';
import { cn } from '../../lib/utils';

interface FullBriefProps {
  lead: Lead;
  onBack: () => void;
}

export function FullBrief({ lead, onBack }: FullBriefProps) {
  const { 
    property, 
    stormHistory, 
    neighborhood, 
    customerHistory,
    insurance, 
    conversationPrep,
    score,
    customerName 
  } = lead;

  return (
    <div className="min-h-screen bg-guardian-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-guardian-950/95 backdrop-blur-sm border-b border-guardian-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg hover:bg-guardian-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-guardian-400" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-guardian-100">{customerName}</h1>
                <p className="text-xs text-guardian-400">{property.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScoreRing value={score.overall} size={40} strokeWidth={3} />
              <button className="p-2 rounded-lg hover:bg-guardian-800 transition-colors">
                <MoreVertical className="w-5 h-5 text-guardian-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs.Root defaultValue="overview" className="w-full">
          <Tabs.List className="flex px-4 gap-1 overflow-x-auto scrollbar-hide">
            <TabTrigger value="overview">Overview</TabTrigger>
            <TabTrigger value="property">Property</TabTrigger>
            <TabTrigger value="storms">Storms</TabTrigger>
            <TabTrigger value="customer">Customer</TabTrigger>
            <TabTrigger value="insurance">Insurance</TabTrigger>
            <TabTrigger value="prep">Prep</TabTrigger>
          </Tabs.List>

          <main className="pb-28">
            {/* Overview Tab */}
            <Tabs.Content value="overview" className="px-4 py-4 space-y-4 animate-fade-in">
              <LeadScoreCard score={score} />
              
              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={`${property.estimatedRoofAge}yr`} label="Roof Age" />
                <StatCard value={`${stormHistory.riskScore}%`} label="Storm Risk" />
                <StatCard value={neighborhood.guardianProjects.length.toString()} label="Projects" />
                <StatCard value={insurance.approvalLikelihood?.[0]?.toUpperCase() || 'N/A'} label="Approval" />
              </div>

              <PropertyIntelCard property={property} compact />
              <StormHistoryCard stormHistory={stormHistory} compact />
              <NeighborhoodCard neighborhood={neighborhood} compact />
              <InsuranceIntelCard insurance={insurance} compact />
              <ConversationPrepCard prep={conversationPrep} compact />
            </Tabs.Content>

            {/* Property Tab */}
            <Tabs.Content value="property" className="px-4 py-4 space-y-4 animate-fade-in">
              <PropertyIntelCard property={property} />
              
              {/* Before/After Examples */}
              {conversationPrep.relevantCaseStudies.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-guardian-100 mb-4">Similar Project</h3>
                    <BeforeAfterSlider 
                      beforeImage={conversationPrep.relevantCaseStudies[0].beforeImageUrl}
                      afterImage={conversationPrep.relevantCaseStudies[0].afterImageUrl}
                    />
                    <p className="text-xs text-guardian-400 mt-3 text-center">
                      {conversationPrep.relevantCaseStudies[0].title}
                    </p>
                  </CardContent>
                </Card>
              )}
            </Tabs.Content>

            {/* Storms Tab */}
            <Tabs.Content value="storms" className="px-4 py-4 space-y-4 animate-fade-in">
              <StormHistoryCard stormHistory={stormHistory} />
              
              {/* Damage Reference Guide */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-guardian-100 mb-3">Hail Damage Reference</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <DamageReference 
                      size={'0.75"'}
                      comparison="Penny"
                      severity="Minor"
                      color="success"
                    />
                    <DamageReference 
                      size={'1.0"'}
                      comparison="Quarter"
                      severity="Moderate"
                      color="warning"
                    />
                    <DamageReference 
                      size={'1.5"+'}
                      comparison="Golf Ball"
                      severity="Severe"
                      color="danger"
                    />
                  </div>
                </CardContent>
              </Card>
            </Tabs.Content>

            {/* Customer Tab */}
            <Tabs.Content value="customer" className="px-4 py-4 space-y-4 animate-fade-in">
              <CustomerHistoryCard history={customerHistory} customerName={customerName} />
              <NeighborhoodCard neighborhood={neighborhood} />
            </Tabs.Content>

            {/* Insurance Tab */}
            <Tabs.Content value="insurance" className="px-4 py-4 space-y-4 animate-fade-in">
              <InsuranceIntelCard insurance={insurance} />
              
              {/* Insurance Process Infographic */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-guardian-100 mb-4">Claims Process</h3>
                  <div className="space-y-3">
                    <ProcessStep step={1} title="Free Inspection" description="We document all damage" active />
                    <ProcessStep step={2} title="File Claim" description="Submit to insurance" />
                    <ProcessStep step={3} title="Adjuster Visit" description="We meet with adjuster" />
                    <ProcessStep step={4} title="Approval" description="Receive claim approval" />
                    <ProcessStep step={5} title="Install" description="Complete the work" />
                  </div>
                </CardContent>
              </Card>
            </Tabs.Content>

            {/* Prep Tab */}
            <Tabs.Content value="prep" className="px-4 py-4 space-y-4 animate-fade-in">
              <ConversationPrepCard prep={conversationPrep} />
            </Tabs.Content>
          </main>
        </Tabs.Root>
      </header>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-guardian-900/95 backdrop-blur-sm border-t border-guardian-800 p-4">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="lg" 
            className="flex-1"
            leftIcon={<Mail className="w-4 h-4" />}
          >
            Email
          </Button>
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

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'px-4 py-2 text-xs font-medium text-guardian-400 whitespace-nowrap',
        'border-b-2 border-transparent transition-colors',
        'hover:text-guardian-200',
        'data-[state=active]:text-storm-400 data-[state=active]:border-storm-400'
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-3 bg-guardian-800/50 rounded-xl text-center">
      <p className="text-lg font-bold text-guardian-100">{value}</p>
      <p className="text-[10px] text-guardian-500">{label}</p>
    </div>
  );
}

function DamageReference({ 
  size, 
  comparison, 
  severity, 
  color 
}: { 
  size: string; 
  comparison: string; 
  severity: string;
  color: 'success' | 'warning' | 'danger';
}) {
  const colors = {
    success: 'bg-success/20 border-success/30 text-success',
    warning: 'bg-warning/20 border-warning/30 text-warning',
    danger: 'bg-danger/20 border-danger/30 text-danger',
  };

  return (
    <div className={cn('p-3 rounded-xl border text-center', colors[color])}>
      <p className="text-lg font-bold">{size}</p>
      <p className="text-[10px] opacity-80">{comparison}</p>
      <Badge variant={color} size="sm" className="mt-2">
        {severity}
      </Badge>
    </div>
  );
}

function ProcessStep({ 
  step, 
  title, 
  description, 
  active = false 
}: { 
  step: number; 
  title: string; 
  description: string;
  active?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors',
      active ? 'bg-storm-500/10 border border-storm-500/20' : 'bg-guardian-800/30'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        active ? 'bg-storm-500 text-white' : 'bg-guardian-700 text-guardian-400'
      )}>
        {step}
      </div>
      <div>
        <p className={cn('text-sm font-medium', active ? 'text-storm-300' : 'text-guardian-300')}>
          {title}
        </p>
        <p className="text-[10px] text-guardian-500">{description}</p>
      </div>
    </div>
  );
}
