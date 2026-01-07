"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Key,
  Webhook,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Database },
  { id: "api", label: "API Keys", icon: Key },
  { id: "appearance", label: "Appearance", icon: Palette },
];

// Mock CRM integration status
const crmIntegrations = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and activities",
    status: "not_connected",
    logo: "🔶",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM integration",
    status: "not_connected",
    logo: "☁️",
  },
  {
    id: "jobnimbus",
    name: "JobNimbus",
    description: "Contractor-focused CRM",
    status: "not_connected",
    logo: "⚡",
  },
];

const dataIntegrations = [
  {
    id: "weather",
    name: "Weather Intelligence",
    description: "NOAA weather data and storm alerts",
    status: "connected",
    lastSync: "2 minutes ago",
  },
  {
    id: "property",
    name: "Property Data",
    description: "Property records and valuations",
    status: "connected",
    lastSync: "1 hour ago",
  },
  {
    id: "maps",
    name: "Mapping Service",
    description: "Geocoding and route optimization",
    status: "pending",
    lastSync: null,
  },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("integrations");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Settings
        </h1>
        <p className="text-surface-400">
          Manage your account, integrations, and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <Card className="w-64 h-fit shrink-0">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? "bg-guardian-500/20 text-guardian-400"
                      : "text-surface-400 hover:text-white hover:bg-surface-800/50"
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {activeSection === "integrations" && (
            <>
              {/* CRM Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-guardian-400" />
                        CRM Integration
                      </CardTitle>
                      <CardDescription>
                        Connect your CRM to sync customer data automatically
                      </CardDescription>
                    </div>
                    <Badge variant="warning">Not Connected</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {crmIntegrations.map((crm) => (
                      <div
                        key={crm.id}
                        className="flex items-center justify-between p-4 bg-surface-800/30 rounded-lg border border-surface-700/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-700/50 flex items-center justify-center text-2xl">
                            {crm.logo}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{crm.name}</h4>
                            <p className="text-sm text-surface-400">{crm.description}</p>
                          </div>
                        </div>
                        <Button variant="outline">
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-guardian-500/10 border border-guardian-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-guardian-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-white mb-1">CRM Not Configured</h4>
                        <p className="text-sm text-surface-400">
                          Guardian Intel is currently using a placeholder CRM adapter. Once you know which CRM Guardian uses, we'll configure the integration here.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    Data Sources
                  </CardTitle>
                  <CardDescription>
                    External data feeds powering your intelligence
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dataIntegrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-4 bg-surface-800/30 rounded-lg border border-surface-700/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            integration.status === "connected" ? "bg-emerald-500" :
                            integration.status === "pending" ? "bg-amber-500" :
                            "bg-surface-500"
                          }`} />
                          <div>
                            <h4 className="font-medium text-white">{integration.name}</h4>
                            <p className="text-sm text-surface-400">{integration.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {integration.lastSync && (
                            <span className="text-xs text-surface-500">
                              Last sync: {integration.lastSync}
                            </span>
                          )}
                          <Badge
                            variant={
                              integration.status === "connected" ? "success" :
                              integration.status === "pending" ? "warning" :
                              "secondary"
                            }
                          >
                            {integration.status === "connected" && <Check className="w-3 h-3 mr-1" />}
                            {integration.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Webhooks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-purple-400" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>
                    Receive real-time updates from external services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-surface-800/30 rounded-lg border border-surface-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">Webhook Endpoint</h4>
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </Button>
                    </div>
                    <code className="block p-3 bg-surface-900 rounded-lg text-sm text-guardian-400 font-mono">
                      https://api.guardian-intel.com/webhooks/abc123xyz
                    </code>
                    <p className="text-xs text-surface-500 mt-2">
                      Use this URL to receive webhook events from your CRM and other services
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-guardian-500 to-accent-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">SM</span>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <p className="text-xs text-surface-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">First Name</label>
                    <input
                      type="text"
                      defaultValue="Sarah"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-guardian-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Last Name</label>
                    <input
                      type="text"
                      defaultValue="Mitchell"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-guardian-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Email</label>
                    <input
                      type="email"
                      defaultValue="sarah.mitchell@guardian.com"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-guardian-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-surface-300">Phone</label>
                    <input
                      type="tel"
                      defaultValue="(555) 123-4567"
                      className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-guardian-500/50"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what alerts you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { id: "storm", label: "Storm Alerts", desc: "Get notified when severe weather affects your customers" },
                  { id: "leads", label: "New Lead Assignments", desc: "When new leads are assigned to you" },
                  { id: "claims", label: "Claim Updates", desc: "Status changes on insurance claims" },
                  { id: "tasks", label: "Task Reminders", desc: "Upcoming tasks and follow-ups" },
                  { id: "team", label: "Team Activity", desc: "Updates from your team members" },
                ].map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between p-4 bg-surface-800/30 rounded-lg">
                    <div>
                      <h4 className="font-medium text-white">{pref.label}</h4>
                      <p className="text-sm text-surface-400">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-700 peer-focus:ring-2 peer-focus:ring-guardian-500/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-guardian-500"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "api" && (
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access for integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-surface-800/30 rounded-lg border border-surface-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Production Key</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <code className="block p-3 bg-surface-900 rounded-lg text-sm text-surface-400 font-mono">
                    gd_live_••••••••••••••••••••••••xxxx
                  </code>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm">Reveal</Button>
                    <Button variant="outline" size="sm">Copy</Button>
                    <Button variant="outline" size="sm" className="text-rose-400 hover:text-rose-300">Revoke</Button>
                  </div>
                </div>
                
                <Button variant="outline">
                  <Key className="w-4 h-4" />
                  Generate New Key
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Theme</h4>
                  <div className="flex gap-3">
                    <button className="p-4 rounded-lg bg-surface-900 border-2 border-guardian-500 flex flex-col items-center gap-2">
                      <div className="w-12 h-8 rounded bg-surface-800 border border-surface-600" />
                      <span className="text-xs text-white">Dark</span>
                    </button>
                    <button className="p-4 rounded-lg bg-surface-800/50 border border-surface-700 flex flex-col items-center gap-2">
                      <div className="w-12 h-8 rounded bg-white border border-surface-200" />
                      <span className="text-xs text-surface-400">Light</span>
                    </button>
                    <button className="p-4 rounded-lg bg-surface-800/50 border border-surface-700 flex flex-col items-center gap-2">
                      <div className="w-12 h-8 rounded bg-gradient-to-r from-surface-800 to-white border" />
                      <span className="text-xs text-surface-400">System</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Accent Color</h4>
                  <div className="flex gap-2">
                    {["#0ca5e9", "#f97316", "#10b981", "#8b5cf6", "#f43f5e"].map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full ${color === "#0ca5e9" ? "ring-2 ring-white ring-offset-2 ring-offset-surface-900" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
