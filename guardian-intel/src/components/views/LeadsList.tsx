import { 
  Search, 
  Filter, 
  Zap,
  MapPin,
  Clock,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ScoreRing } from '../ui/Progress';
import type { Lead } from '../../types';
import { formatRelativeDate } from '../../lib/utils';

interface LeadsListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function LeadsList({ leads, onSelectLead }: LeadsListProps) {
  const hotLeads = leads.filter(l => l.score.recommendation === 'hot');
  const scheduledLeads = leads.filter(l => l.appointmentDate);

  return (
    <div className="min-h-screen bg-guardian-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-guardian-950 border-b border-guardian-800">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-guardian-100">Guardian Intel</h1>
              <p className="text-xs text-guardian-400">Pre-engagement intelligence</p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Lead
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-guardian-500" />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full pl-10 pr-10 py-2.5 bg-guardian-800/50 border border-guardian-700 rounded-xl text-sm text-guardian-200 placeholder-guardian-500 focus:outline-none focus:ring-2 focus:ring-storm-500 focus:border-transparent"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-guardian-700 rounded-lg transition-colors">
              <Filter className="w-4 h-4 text-guardian-500" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          <QuickStat value={leads.length} label="Total" />
          <QuickStat value={hotLeads.length} label="Hot" variant="danger" />
          <QuickStat value={scheduledLeads.length} label="Scheduled" variant="info" />
          <QuickStat value={leads.filter(l => l.status === 'new').length} label="New" variant="success" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Hot Leads Section */}
        {hotLeads.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-semibold text-guardian-200">Hot Leads</h2>
              <Badge variant="danger" size="sm">{hotLeads.length}</Badge>
            </div>
            <div className="space-y-2">
              {hotLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead)} />
              ))}
            </div>
          </section>
        )}

        {/* Scheduled Today */}
        {scheduledLeads.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-info" />
              <h2 className="text-sm font-semibold text-guardian-200">Scheduled</h2>
            </div>
            <div className="space-y-2">
              {scheduledLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead)} showSchedule />
              ))}
            </div>
          </section>
        )}

        {/* All Leads */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-guardian-200">All Leads</h2>
            <span className="text-xs text-guardian-500">{leads.length} total</span>
          </div>
          <div className="space-y-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => onSelectLead(lead)} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function QuickStat({ 
  value, 
  label, 
  variant = 'default' 
}: { 
  value: number; 
  label: string; 
  variant?: 'default' | 'danger' | 'info' | 'success';
}) {
  const colors = {
    default: 'bg-guardian-800/50 border-guardian-700',
    danger: 'bg-danger/10 border-danger/30',
    info: 'bg-info/10 border-info/30',
    success: 'bg-success/10 border-success/30',
  };

  const textColors = {
    default: 'text-guardian-200',
    danger: 'text-danger',
    info: 'text-info',
    success: 'text-success',
  };

  return (
    <div className={`px-4 py-2 rounded-xl border ${colors[variant]} flex-shrink-0`}>
      <p className={`text-lg font-bold ${textColors[variant]}`}>{value}</p>
      <p className="text-[10px] text-guardian-500">{label}</p>
    </div>
  );
}

function LeadCard({ 
  lead, 
  onClick, 
  showSchedule = false 
}: { 
  lead: Lead; 
  onClick: () => void;
  showSchedule?: boolean;
}) {
  const recommendationColors = {
    hot: 'danger',
    warm: 'warning',
    cold: 'info',
  } as const;

  return (
    <Card variant="interactive" onClick={onClick}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ScoreRing value={lead.score.overall} size={44} strokeWidth={3} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-guardian-100 line-clamp-1">
                  {lead.customerName}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-guardian-500" />
                  <p className="text-xs text-guardian-400 line-clamp-1">{lead.property.address}</p>
                </div>
              </div>
              <Badge variant={recommendationColors[lead.score.recommendation]} size="sm">
                {lead.score.recommendation.toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-guardian-500">
                {lead.property.estimatedRoofAge}yr roof
              </span>
              <span className="text-guardian-700">•</span>
              <span className="text-[10px] text-guardian-500">
                {lead.stormHistory.riskScore}% storm risk
              </span>
              <span className="text-guardian-700">•</span>
              <span className="text-[10px] text-guardian-500">
                {formatRelativeDate(lead.updatedAt)}
              </span>
            </div>

            {showSchedule && lead.appointmentDate && (
              <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-info/10 rounded-lg w-fit">
                <Clock className="w-3 h-3 text-info" />
                <span className="text-[10px] text-info font-medium">
                  {lead.appointmentDate} at {lead.appointmentTime}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-guardian-600 flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}
