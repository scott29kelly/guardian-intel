import { 
  MessageCircle, 
  Lightbulb, 
  ShieldQuestion,
  Star,
  Quote,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ConversationPrep, ConversationStarter, ObjectionResponse, Testimonial } from '../../types';

interface ConversationPrepCardProps {
  prep: ConversationPrep;
  compact?: boolean;
}

export function ConversationPrepCard({ prep, compact = false }: ConversationPrepCardProps) {
  const { starters, objectionResponses, keyTalkingPoints, testimonials } = prep;

  if (compact) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-storm-400" />
              <span className="text-sm font-medium text-guardian-200">Talk Points</span>
            </div>
            <Badge variant="info" size="sm">
              {keyTalkingPoints.length} Points
            </Badge>
          </div>
          
          <ul className="space-y-1.5">
            {keyTalkingPoints.slice(0, 3).map((point, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-guardian-300">
                <span className="text-storm-400 font-medium">{index + 1}.</span>
                <span className="line-clamp-1">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<MessageCircle className="w-4 h-4" />}>Conversation Prep</CardTitle>
        <Badge variant="info">{starters.length + objectionResponses.length} Prepared</Badge>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Key Talking Points */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-warning" />
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Key Talking Points
            </h4>
          </div>
          <div className="space-y-2">
            {keyTalkingPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-guardian-800/30 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-storm-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-storm-400">{index + 1}</span>
                </span>
                <p className="text-sm text-guardian-200 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Starters */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-success" />
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Conversation Starters
            </h4>
          </div>
          <div className="space-y-2">
            {starters.map((starter) => (
              <StarterCard key={starter.id} starter={starter} />
            ))}
          </div>
        </div>

        {/* Objection Responses */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldQuestion className="w-4 h-4 text-danger" />
            <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
              Objection Handling
            </h4>
          </div>
          <div className="space-y-2">
            {objectionResponses.map((objection) => (
              <ObjectionCard key={objection.id} objection={objection} />
            ))}
          </div>
        </div>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warning" />
              <h4 className="text-xs font-medium text-guardian-400 uppercase tracking-wider">
                Relevant Testimonials
              </h4>
            </div>
            <div className="space-y-2">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StarterCard({ starter }: { starter: ConversationStarter }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityColors = {
    high: 'border-success/30 bg-success/5',
    medium: 'border-warning/30 bg-warning/5',
    low: 'border-guardian-700 bg-guardian-800/30',
  };

  return (
    <div className={`rounded-xl border ${priorityColors[starter.priority]} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          starter.priority === 'high' ? 'bg-success' : 
          starter.priority === 'medium' ? 'bg-warning' : 'bg-guardian-500'
        }`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-guardian-400">{starter.topic}</span>
            <Badge variant={starter.priority === 'high' ? 'success' : starter.priority === 'medium' ? 'warning' : 'outline'} size="sm">
              {starter.priority}
            </Badge>
          </div>
          <p className="text-sm text-guardian-200 leading-relaxed">"{starter.opener}"</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-guardian-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-guardian-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-5 pl-3 border-l-2 border-guardian-700">
            <p className="text-xs text-guardian-400 italic">{starter.context}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectionCard({ objection }: { objection: ObjectionResponse }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-danger/20 bg-danger/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <ShieldQuestion className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-guardian-200">"{objection.objection}"</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-guardian-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-guardian-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 space-y-2">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
              <p className="text-sm text-guardian-300">{objection.response}</p>
            </div>
            {objection.supportingData && (
              <div className="p-2 bg-guardian-800/50 rounded-lg">
                <p className="text-[10px] text-guardian-500 uppercase mb-0.5">Supporting Data</p>
                <p className="text-xs text-guardian-400">{objection.supportingData}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="p-4 bg-guardian-800/30 rounded-xl">
      <div className="flex items-start gap-3">
        <Quote className="w-5 h-5 text-storm-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-guardian-200 italic leading-relaxed">"{testimonial.quote}"</p>
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-xs font-medium text-guardian-300">{testimonial.customerName}</p>
              {testimonial.neighborhood && (
                <p className="text-[10px] text-guardian-500">{testimonial.neighborhood}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i < testimonial.rating ? 'text-warning fill-warning' : 'text-guardian-600'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
