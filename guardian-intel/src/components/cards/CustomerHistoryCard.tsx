import { 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  Calendar,
  ClipboardCheck,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { CustomerHistory, CustomerInteraction } from '../../types';
import { formatDate, formatRelativeDate } from '../../lib/utils';

interface CustomerHistoryCardProps {
  history: CustomerHistory;
  customerName: string;
  compact?: boolean;
}

export function CustomerHistoryCard({ history, customerName, compact = false }: CustomerHistoryCardProps) {
  const { isReturning, interactions, referralSource, preferredContactMethod, tags, doNotContact } = history;

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-storm-400" />
              <span className="text-sm font-medium text-guardian-200">Customer</span>
            </div>
            {isReturning ? (
              <Badge variant="info" size="sm">Returning</Badge>
            ) : (
              <Badge variant="outline" size="sm">New</Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-guardian-400">{history.totalInteractions} interactions</p>
              {interactions.length > 0 && (
                <p className="text-[10px] text-guardian-500">
                  Last: {formatRelativeDate(interactions[0].date)}
                </p>
              )}
            </div>
            {preferredContactMethod && (
              <Badge variant="outline" size="sm">
                {preferredContactMethod === 'phone' && <Phone className="w-3 h-3 mr-1" />}
                {preferredContactMethod === 'email' && <Mail className="w-3 h-3 mr-1" />}
                {preferredContactMethod === 'text' && <MessageSquare className="w-3 h-3 mr-1" />}
                {preferredContactMethod}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<User className="w-4 h-4" />}>Customer History</CardTitle>
        <div className="flex items-center gap-2">
          {doNotContact && (
            <Badge variant="danger">
              <AlertCircle className="w-3 h-3 mr-1" /> DNC
            </Badge>
          )}
          {isReturning ? (
            <Badge variant="info">Returning Customer</Badge>
          ) : (
            <Badge variant="outline">New Lead</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Customer Overview */}
        <div className="flex items-center gap-4 p-3 bg-guardian-800/50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-storm-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-storm-400">
              {customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-guardian-100">{customerName}</h4>
            <div className="flex items-center gap-3 mt-1">
              {referralSource && (
                <span className="text-[10px] text-guardian-400">
                  Source: {referralSource}
                </span>
              )}
              {history.firstContact && (
                <span className="text-[10px] text-guardian-500">
                  First contact: {formatDate(history.firstContact)}
                </span>
              )}
            </div>
          </div>
          {preferredContactMethod && (
            <div className="text-right">
              <p className="text-[10px] text-guardian-500 uppercase">Preferred</p>
              <div className="flex items-center gap-1 text-storm-400">
                {getContactIcon(preferredContactMethod)}
                <span className="text-xs capitalize">{preferredContactMethod}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" size="sm">
                <Tag className="w-2.5 h-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Interaction Timeline */}
        {interactions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider mb-3">
              Interaction History
            </h4>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-guardian-700" />
              
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <InteractionRow key={interaction.id} interaction={interaction} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Notes */}
        {interactions.some(i => i.notes) && (
          <div className="p-3 bg-warning/5 border border-warning/10 rounded-lg">
            <h5 className="text-xs font-medium text-warning mb-2">📝 Key Notes</h5>
            <ul className="space-y-1.5">
              {interactions.filter(i => i.notes).map((i) => (
                <li key={i.id} className="text-xs text-guardian-300 flex items-start gap-2">
                  <span className="text-guardian-600 mt-0.5">•</span>
                  {i.notes}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InteractionRow({ interaction }: { interaction: CustomerInteraction }) {
  const getOutcomeColor = () => {
    switch (interaction.outcome) {
      case 'positive': return 'bg-success';
      case 'negative': return 'bg-danger';
      case 'pending': return 'bg-warning';
      default: return 'bg-guardian-500';
    }
  };

  return (
    <div className="flex gap-3 relative">
      {/* Timeline dot */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${getInteractionBg(interaction.type)}`}>
        {getInteractionIcon(interaction.type)}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-guardian-200 capitalize">{interaction.type}</span>
            <span className="text-[10px] text-guardian-500">{formatRelativeDate(interaction.date)}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${getOutcomeColor()}`} />
        </div>
        <p className="text-xs text-guardian-400 mt-1">{interaction.summary}</p>
        <p className="text-[10px] text-guardian-500 mt-1">Rep: {interaction.repName}</p>
      </div>
    </div>
  );
}

function getInteractionIcon(type: string) {
  const iconClass = "w-4 h-4";
  switch (type) {
    case 'call': return <Phone className={iconClass} />;
    case 'visit': return <User className={iconClass} />;
    case 'email': return <Mail className={iconClass} />;
    case 'text': return <MessageSquare className={iconClass} />;
    case 'inspection': return <ClipboardCheck className={iconClass} />;
    case 'quote': return <FileText className={iconClass} />;
    default: return <Calendar className={iconClass} />;
  }
}

function getInteractionBg(type: string) {
  switch (type) {
    case 'call': return 'bg-storm-500/20 text-storm-400';
    case 'visit': return 'bg-success/20 text-success';
    case 'email': return 'bg-info/20 text-info';
    case 'text': return 'bg-warning/20 text-warning';
    case 'inspection': return 'bg-guardian-700 text-guardian-300';
    case 'quote': return 'bg-guardian-700 text-guardian-300';
    default: return 'bg-guardian-700 text-guardian-400';
  }
}

function getContactIcon(method: string) {
  const iconClass = "w-3.5 h-3.5";
  switch (method) {
    case 'phone': return <Phone className={iconClass} />;
    case 'email': return <Mail className={iconClass} />;
    case 'text': return <MessageSquare className={iconClass} />;
    default: return <User className={iconClass} />;
  }
}
