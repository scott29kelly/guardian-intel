import { 
  Shield, 
  Clock, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import type { InsuranceIntel } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';

interface InsuranceIntelCardProps {
  insurance: InsuranceIntel;
  compact?: boolean;
}

export function InsuranceIntelCard({ insurance, compact = false }: InsuranceIntelCardProps) {
  const { 
    knownCarrier, 
    typicalDeductible, 
    carrierNotes, 
    claimFilingDeadline, 
    daysUntilDeadline,
    approvalLikelihood 
  } = insurance;

  const getLikelihoodConfig = () => {
    switch (approvalLikelihood) {
      case 'high': return { color: 'success', label: 'High', percentage: 85 };
      case 'medium': return { color: 'warning', label: 'Medium', percentage: 55 };
      case 'low': return { color: 'danger', label: 'Low', percentage: 25 };
      default: return { color: 'default', label: 'Unknown', percentage: 50 };
    }
  };

  const likelihood = getLikelihoodConfig();

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-storm-400" />
              <span className="text-sm font-medium text-guardian-200">Insurance</span>
            </div>
            {knownCarrier && (
              <Badge variant="outline" size="sm">{knownCarrier}</Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-guardian-400">Approval Likelihood</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={likelihood.percentage} size="sm" variant="score" className="w-16" />
                <span className="text-xs font-medium text-guardian-200">{likelihood.label}</span>
              </div>
            </div>
            {daysUntilDeadline && (
              <div className="text-right">
                <p className="text-[10px] text-guardian-500">Deadline</p>
                <p className="text-sm font-semibold text-warning">{daysUntilDeadline}d</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Shield className="w-4 h-4" />}>Insurance Intel</CardTitle>
        <Badge variant={likelihood.color as 'success' | 'warning' | 'danger' | 'default'}>
          {likelihood.label} Approval
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Carrier Info */}
        {knownCarrier && (
          <div className="flex items-center gap-4 p-4 bg-guardian-800/50 rounded-xl">
            {insurance.carrierLogo ? (
              <img 
                src={insurance.carrierLogo} 
                alt={knownCarrier}
                className="w-12 h-12 rounded-lg bg-white p-2 object-contain"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-guardian-700 flex items-center justify-center">
                <Shield className="w-6 h-6 text-guardian-400" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-guardian-100">{knownCarrier}</h4>
              <p className="text-xs text-guardian-400 mt-0.5">Insurance Carrier</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-guardian-500 uppercase">Deductible Range</p>
              <p className="text-sm font-medium text-guardian-200">
                {formatCurrency(typicalDeductible.min)} - {formatCurrency(typicalDeductible.max)}
              </p>
            </div>
          </div>
        )}

        {/* Approval Likelihood */}
        <div className="p-4 bg-guardian-800/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Approval Likelihood
            </h4>
            <span className={`text-sm font-bold ${
              likelihood.color === 'success' ? 'text-success' : 
              likelihood.color === 'warning' ? 'text-warning' : 
              likelihood.color === 'danger' ? 'text-danger' : 'text-guardian-300'
            }`}>
              {likelihood.label}
            </span>
          </div>
          <Progress value={likelihood.percentage} size="lg" variant="score" />
          <p className="text-[10px] text-guardian-500 mt-2">
            Based on carrier patterns, roof condition, and storm documentation
          </p>
        </div>

        {/* Claim Deadline */}
        {claimFilingDeadline && (
          <div className={`p-4 rounded-xl border ${
            daysUntilDeadline && daysUntilDeadline < 90 
              ? 'bg-danger/10 border-danger/20' 
              : 'bg-warning/10 border-warning/20'
          }`}>
            <div className="flex items-start gap-3">
              <Clock className={`w-5 h-5 ${daysUntilDeadline && daysUntilDeadline < 90 ? 'text-danger' : 'text-warning'}`} />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-guardian-100">Claim Filing Deadline</h4>
                <p className="text-xs text-guardian-400 mt-0.5">
                  {formatDate(claimFilingDeadline)}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  daysUntilDeadline && daysUntilDeadline < 90 ? 'text-danger' : 'text-warning'
                }`}>
                  {daysUntilDeadline}
                </span>
                <p className="text-[10px] text-guardian-500">days left</p>
              </div>
            </div>
          </div>
        )}

        {/* Carrier Notes */}
        {carrierNotes && carrierNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-3.5 h-3.5 text-storm-400" />
              <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
                Carrier-Specific Intel
              </h4>
            </div>
            <div className="space-y-2">
              {carrierNotes.map((note, index) => (
                <div key={index} className="flex items-start gap-2 p-2.5 bg-guardian-800/30 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-storm-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-guardian-300">{note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjuster Notes */}
        {insurance.adjustersNotes && (
          <div className="p-3 bg-info/5 border border-info/10 rounded-lg">
            <h5 className="text-xs font-medium text-info mb-1">👤 Adjuster Intel</h5>
            <p className="text-xs text-guardian-300">{insurance.adjustersNotes}</p>
          </div>
        )}

        {/* Checklist */}
        <div>
          <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider mb-3">
            Pre-Claim Checklist
          </h4>
          <div className="space-y-2">
            <ChecklistItem label="Document storm date and severity" checked />
            <ChecklistItem label="Complete roof inspection" checked={false} />
            <ChecklistItem label="Photo documentation ready" checked={false} />
            <ChecklistItem label="Homeowner signature on authorization" checked={false} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-guardian-800/30 transition-colors cursor-pointer">
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        checked 
          ? 'bg-success border-success' 
          : 'border-guardian-600 hover:border-guardian-500'
      }`}>
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
      <span className={`text-xs ${checked ? 'text-guardian-400 line-through' : 'text-guardian-300'}`}>
        {label}
      </span>
    </div>
  );
}
