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
  Mic,
  Image,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DeckTemplate, ExportFormat, ArtifactConfig } from '../types/deck.types';
import { DEFAULT_ARTIFACT_CONFIGS } from '../types/deck.types';

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
  artifactConfigs?: ArtifactConfig[];
  onArtifactConfigsChange?: (configs: ArtifactConfig[]) => void;
}

const ARTIFACT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; description: string }> = {
  'slide-deck': { icon: Presentation, label: 'Slide Deck', description: 'Visual presentation with data-driven slides' },
  'audio': { icon: Mic, label: 'Audio Briefing', description: 'Podcast-style briefing to listen on the go' },
  'infographic': { icon: Image, label: 'Infographic', description: 'One-page visual summary for leave-behinds' },
  'report': { icon: BookOpen, label: 'Written Report', description: 'Detailed strategic analysis document' },
};

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
        <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Context
        </h3>
        <div className="space-y-3">
          {template.requiredContext.map(ctx => (
            <div key={ctx.type}>
              <label className="block text-sm text-text-muted mb-1">
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
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
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
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
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
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
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
                    className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
                  />
                  <span className="flex items-center text-text-muted">to</span>
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
                    className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={(context[`${ctx.type}Id`] as string) || ''}
                  onChange={e => onContextChange({ ...context, [`${ctx.type}Id`]: e.target.value })}
                  placeholder={ctx.placeholder}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-intel-500/50 focus:border-intel-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section Selection */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
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
                    ? 'bg-surface-secondary/80 border-intel-500/30'
                    : 'bg-surface-secondary/30 border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !isRequired && toggleSection(section.id)}
                    disabled={isRequired}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isEnabled
                        ? 'bg-intel-500 text-void-900'
                        : 'bg-surface-hover text-text-muted'
                    } ${isRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-intel-400'}`}
                  >
                    {isEnabled && <Check className="w-3 h-3" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isEnabled ? 'text-text-primary' : 'text-text-muted'}`}>
                        {section.title}
                      </span>
                      {section.aiEnhanced && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-intel-500/20 text-intel-300 text-xs rounded">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                      {isRequired && (
                        <span className="text-xs text-text-muted">(required)</span>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-text-muted mt-0.5">{section.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Output Types */}
      {onArtifactConfigsChange && (
        <ArtifactSelector
          configs={artifactConfigs || DEFAULT_ARTIFACT_CONFIGS}
          onChange={onArtifactConfigsChange}
        />
      )}

      {/* Export Format */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
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
                  ? 'bg-intel-500 text-void-900'
                  : 'bg-surface-secondary text-text-secondary hover:bg-page-hover'
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

// =============================================================================
// ARTIFACT SELECTOR SUB-COMPONENT
// =============================================================================

function ArtifactSelector({
  configs,
  onChange,
}: {
  configs: ArtifactConfig[];
  onChange: (configs: ArtifactConfig[]) => void;
}) {
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  const updateConfig = (type: string, updates: Partial<ArtifactConfig>) => {
    onChange(configs.map(c => c.type === type ? { ...c, ...updates } : c));
  };

  const toggleArtifact = (type: string) => {
    // slide-deck is always enabled
    if (type === 'slide-deck') return;
    const config = configs.find(c => c.type === type);
    if (config) {
      updateConfig(type, { enabled: !config.enabled });
      if (!config.enabled) setExpandedArtifact(type);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Output Types
      </h3>
      <div className="space-y-2">
        {configs.map(config => {
          const meta = ARTIFACT_META[config.type];
          if (!meta) return null;
          const Icon = meta.icon;
          const isExpanded = expandedArtifact === config.type;
          const isAlwaysOn = config.type === 'slide-deck';

          return (
            <div
              key={config.type}
              className={`rounded-lg border transition-colors ${
                config.enabled
                  ? 'bg-surface-secondary/80 border-intel-500/30'
                  : 'bg-surface-secondary/30 border-border'
              }`}
            >
              {/* Toggle row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleArtifact(config.type)}
                    disabled={isAlwaysOn}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      config.enabled
                        ? 'bg-intel-500 text-void-900'
                        : 'bg-surface-hover text-text-muted'
                    } ${isAlwaysOn ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-intel-400'}`}
                  >
                    {config.enabled && <Check className="w-3 h-3" />}
                  </button>
                  <Icon className={`w-4 h-4 ${config.enabled ? 'text-intel-400' : 'text-text-muted'}`} />
                  <div>
                    <span className={`text-sm font-medium ${config.enabled ? 'text-text-primary' : 'text-text-muted'}`}>
                      {meta.label}
                    </span>
                    <p className="text-xs text-text-muted">{meta.description}</p>
                  </div>
                </div>
                {config.enabled && (
                  <button
                    onClick={() => setExpandedArtifact(isExpanded ? null : config.type)}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Settings panel */}
              {config.enabled && isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                  {config.type === 'slide-deck' && (
                    <>
                      <SettingSelect label="Format" value={config.format || 'detailed'}
                        options={[['detailed', 'Detailed'], ['presenter', 'Presenter']]}
                        onChange={v => updateConfig('slide-deck', { format: v as ArtifactConfig['format'] })} />
                      <SettingSelect label="Length" value={config.length || 'default'}
                        options={[['default', 'Default'], ['short', 'Short']]}
                        onChange={v => updateConfig('slide-deck', { length: v as ArtifactConfig['length'] })} />
                      <SettingSelect label="Download As" value={config.downloadFormat || 'pdf'}
                        options={[['pdf', 'PDF'], ['pptx', 'PowerPoint']]}
                        onChange={v => updateConfig('slide-deck', { downloadFormat: v as ArtifactConfig['downloadFormat'] })} />
                      <SettingText label="Custom Instructions" value={config.description || ''}
                        placeholder="e.g., include speaker notes, focus on insurance risks..."
                        onChange={v => updateConfig('slide-deck', { description: v })} />
                    </>
                  )}
                  {config.type === 'audio' && (
                    <>
                      <SettingSelect label="Format" value={config.audioFormat || 'deep-dive'}
                        options={[['deep-dive', 'Deep Dive'], ['brief', 'Brief'], ['critique', 'Critique'], ['debate', 'Debate']]}
                        onChange={v => updateConfig('audio', { audioFormat: v as ArtifactConfig['audioFormat'] })} />
                      <SettingSelect label="Length" value={config.audioLength || 'default'}
                        options={[['short', 'Short (~3 min)'], ['default', 'Default (~8 min)'], ['long', 'Long (~15 min)']]}
                        onChange={v => updateConfig('audio', { audioLength: v as ArtifactConfig['audioLength'] })} />
                    </>
                  )}
                  {config.type === 'infographic' && (
                    <>
                      <SettingSelect label="Style" value={config.style || 'professional'}
                        options={[['professional', 'Professional'], ['bento-grid', 'Bento Grid'], ['editorial', 'Editorial'], ['sketch-note', 'Sketch Note'], ['instructional', 'Instructional'], ['scientific', 'Scientific']]}
                        onChange={v => updateConfig('infographic', { style: v as ArtifactConfig['style'] })} />
                      <SettingSelect label="Detail" value={config.detail || 'standard'}
                        options={[['concise', 'Concise'], ['standard', 'Standard'], ['detailed', 'Detailed']]}
                        onChange={v => updateConfig('infographic', { detail: v as ArtifactConfig['detail'] })} />
                      <SettingSelect label="Orientation" value={config.orientation || 'landscape'}
                        options={[['landscape', 'Landscape'], ['portrait', 'Portrait'], ['square', 'Square']]}
                        onChange={v => updateConfig('infographic', { orientation: v as ArtifactConfig['orientation'] })} />
                    </>
                  )}
                  {config.type === 'report' && (
                    <>
                      <SettingSelect label="Format" value={config.reportFormat || 'briefing-doc'}
                        options={[['briefing-doc', 'Briefing Doc'], ['study-guide', 'Study Guide'], ['blog-post', 'Blog Post'], ['custom', 'Custom']]}
                        onChange={v => updateConfig('report', { reportFormat: v as ArtifactConfig['reportFormat'] })} />
                      <SettingText label="Extra Instructions" value={config.appendInstructions || ''}
                        placeholder="e.g., focus on financial leverage, target audience: managers..."
                        onChange={v => updateConfig('report', { appendInstructions: v })} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-text-muted whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 bg-surface-secondary border border-border rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-intel-500/50"
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}

function SettingText({ label, value, placeholder, onChange }: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="text-xs text-text-muted block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1 bg-surface-secondary border border-border rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-intel-500/50"
      />
    </div>
  );
}
