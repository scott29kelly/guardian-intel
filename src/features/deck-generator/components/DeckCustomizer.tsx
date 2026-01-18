"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Layers,
  Download,
  Check,
  Sparkles,
  FileText,
  Presentation,
  Link,
} from 'lucide-react';
import type { DeckTemplate, ExportFormat } from '../types/deck.types';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
}

interface DeckCustomizerProps {
  template: DeckTemplate;
  context: Record<string, unknown>;
  onContextChange: (context: Record<string, unknown>) => void;
  enabledSections: string[];
  onSectionsChange: (sections: string[]) => void;
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
}

export function DeckCustomizer({
  template,
  context,
  onContextChange,
  enabledSections,
  onSectionsChange,
  exportFormat,
  onExportFormatChange,
}: DeckCustomizerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Fetch customers for the selector
  useEffect(() => {
    if (template.requiredContext.some(ctx => ctx.type === 'customer')) {
      setIsLoadingCustomers(true);
      fetch('/api/customers?limit=50')
        .then(res => res.json())
        .then(data => {
          setCustomers(data.data || []);
        })
        .catch(console.error)
        .finally(() => setIsLoadingCustomers(false));
    }
  }, [template]);

  const toggleSection = (sectionId: string) => {
    if (enabledSections.includes(sectionId)) {
      onSectionsChange(enabledSections.filter(id => id !== sectionId));
    } else {
      onSectionsChange([...enabledSections, sectionId]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Context Selection */}
      <div>
        <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Context
        </h3>
        <div className="space-y-3">
          {template.requiredContext.map(ctx => (
            <div key={ctx.type}>
              <label className="block text-sm text-surface-400 mb-1">
                {ctx.label}
                {ctx.required && <span className="text-rose-400 ml-1">*</span>}
              </label>
              
              {ctx.type === 'customer' ? (
                <select
                  value={(context.customerId as string) || ''}
                  onChange={e => {
                    const customer = customers.find(c => c.id === e.target.value);
                    onContextChange({ 
                      ...context, 
                      customerId: e.target.value,
                      customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
                    });
                  }}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                  disabled={isLoadingCustomers}
                >
                  <option value="">{isLoadingCustomers ? 'Loading...' : ctx.placeholder}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName} - {customer.address}, {customer.city}
                    </option>
                  ))}
                </select>
              ) : ctx.type === 'region' ? (
                <select
                  value={(context.regionId as string) || ''}
                  onChange={e => onContextChange({ ...context, regionId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                >
                  <option value="">{ctx.placeholder || 'All regions'}</option>
                  <option value="pa">Pennsylvania</option>
                  <option value="nj">New Jersey</option>
                  <option value="de">Delaware</option>
                  <option value="md">Maryland</option>
                  <option value="va">Virginia</option>
                  <option value="ny">New York</option>
                </select>
              ) : ctx.type === 'team' ? (
                <select
                  value={(context.teamId as string) || ''}
                  onChange={e => onContextChange({ ...context, teamId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                >
                  <option value="">{ctx.placeholder || 'All teams'}</option>
                  <option value="team-a">Team A - Northeast</option>
                  <option value="team-b">Team B - Southeast</option>
                  <option value="team-c">Team C - Central</option>
                </select>
              ) : ctx.type === 'date-range' ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={(context.dateRange as { start?: string; end?: string })?.start || ''}
                    onChange={e => onContextChange({ 
                      ...context, 
                      dateRange: { 
                        ...((context.dateRange as { start?: string; end?: string }) || {}), 
                        start: e.target.value 
                      } 
                    })}
                    className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                  />
                  <span className="flex items-center text-surface-500">to</span>
                  <input
                    type="date"
                    value={(context.dateRange as { start?: string; end?: string })?.end || ''}
                    onChange={e => onContextChange({ 
                      ...context, 
                      dateRange: { 
                        ...((context.dateRange as { start?: string; end?: string }) || {}), 
                        end: e.target.value 
                      } 
                    })}
                    className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={(context[`${ctx.type}Id`] as string) || ''}
                  onChange={e => onContextChange({ ...context, [`${ctx.type}Id`]: e.target.value })}
                  placeholder={ctx.placeholder}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-guardian-500/50 focus:border-guardian-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section Selection */}
      <div>
        <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Slides to Include
        </h3>
        <div className="space-y-2">
          {template.sections.map((section, index) => {
            const isEnabled = enabledSections.includes(section.id);
            const isRequired = !section.optional;
            
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isEnabled
                    ? 'bg-surface-800/80 border-accent-500/30'
                    : 'bg-surface-800/30 border-surface-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !isRequired && toggleSection(section.id)}
                    disabled={isRequired}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isEnabled
                        ? 'bg-accent-500 text-surface-900'
                        : 'bg-surface-700 text-surface-500'
                    } ${isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent-400'}`}
                  >
                    {isEnabled && <Check className="w-3 h-3" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isEnabled ? 'text-white' : 'text-surface-400'}`}>
                        {section.title}
                      </span>
                      {section.aiEnhanced && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent-500/20 text-accent-400 text-xs rounded">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      {isRequired && (
                        <span className="text-xs text-surface-500">(required)</span>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-surface-500 mt-0.5">{section.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Export Format */}
      <div>
        <h3 className="text-sm font-medium text-surface-300 mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Format
        </h3>
        <div className="flex gap-2">
          {([
            { format: 'pdf' as const, icon: FileText, label: 'PDF' },
            { format: 'pptx' as const, icon: Presentation, label: 'PPTX' },
            { format: 'link' as const, icon: Link, label: 'Link' },
          ]).map(({ format, icon: Icon, label }) => (
            <button
              key={format}
              onClick={() => onExportFormatChange(format)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                exportFormat === format
                  ? 'bg-accent-500 text-surface-900'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
