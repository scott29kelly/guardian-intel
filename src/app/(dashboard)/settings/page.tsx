"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Bell,
  Database,
  Palette,
  Globe,
  Key,
  Webhook,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme-context";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Database },
  { id: "api", label: "API Keys", icon: Key },
  { id: "appearance", label: "Appearance", icon: Palette },
];

// Mock CRM integration status - Leap is the target CRM
const crmIntegrations = [
  {
    id: "leap",
    name: "Leap CRM",
    description: "Guardian's primary CRM - sync contacts, jobs, and appointments",
    status: "pending",
    logo: "🚀",
    url: "https://leaptodigital.com",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Alternative CRM integration",
    status: "not_connected",
    logo: "🔶",
    url: "https://hubspot.com",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM integration",
    status: "not_connected",
    logo: "☁️",
    url: "https://salesforce.com",
  },
];

const dataIntegrations = [
  {
    id: "weather",
    name: "Weather Intelligence",
    description: "NOAA weather data and storm alerts",
    status: "connected",
    lastSync: "2 minutes ago",
    url: "https://api.weather.gov",
  },
  {
    id: "property",
    name: "Property Data",
    description: "Property records and valuations",
    status: "connected",
    lastSync: "1 hour ago",
    url: null,
  },
  {
    id: "maps",
    name: "Mapping Service",
    description: "RainViewer radar and geocoding",
    status: "connected",
    lastSync: "Live",
    url: "https://rainviewer.com",
  },
];

// Mock notification preferences
const defaultNotifications = {
  storm: true,
  leads: true,
  claims: true,
  tasks: true,
  team: false,
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("gd_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [webhookUrl, setWebhookUrl] = useState("https://api.guardian-intel.com/webhooks/abc123xyz");
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState("#0ca5e9");
  
  // Profile form state
  const [profile, setProfile] = useState({
    firstName: "Sarah",
    lastName: "Mitchell",
    email: "sarah.mitchell@guardian.com",
    phone: "(555) 123-4567",
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    showToast("success", "Saved", "Your changes have been saved successfully");
  };

  const handleConnectCRM = (crmId: string, crmName: string) => {
    setShowConnectModal(crmId);
  };

  const handleConfirmConnect = async (crmId: string, crmName: string) => {
    showToast("info", "Connecting...", `Initiating OAuth flow for ${crmName}...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowConnectModal(null);
    
    if (crmId === "leap") {
      showToast("success", "Connection Initiated", "Leap CRM integration is being configured. Contact support to complete setup.");
    } else {
      showToast("info", "Coming Soon", `${crmName} integration will be available in a future update`);
    }
  };

  const handleRegenerateWebhook = async () => {
    const newUrl = `https://api.guardian-intel.com/webhooks/${Math.random().toString(36).substring(7)}`;
    setWebhookUrl(newUrl);
    showToast("success", "Webhook Regenerated", "New webhook URL has been generated");
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    showToast("success", "Copied", "Webhook URL copied to clipboard");
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    showToast("success", "Copied", "API key copied to clipboard");
  };

  const handleRevokeKey = async () => {
    setApiKey("");
    showToast("error", "Key Revoked", "API key has been revoked. Generate a new one to continue.");
  };

  const handleGenerateKey = async () => {
    const newKey = `gd_live_${Math.random().toString(36).substring(2, 34)}`;
    setApiKey(newKey);
    showToast("success", "Key Generated", "New API key has been created");
  };

  const handleToggleNotification = (id: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [id]: !prev[id] }));
    showToast("success", "Updated", `${id.charAt(0).toUpperCase() + id.slice(1)} notifications ${notifications[id] ? "disabled" : "enabled"}`);
  };

  const handleSyncData = async (integrationName: string) => {
    showToast("info", "Syncing...", `Refreshing ${integrationName} data...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    showToast("success", "Synced", `${integrationName} data has been refreshed`);
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "gray" | "light-gray") => {
    setTheme(newTheme);
    showToast("success", "Theme Changed", `Switched to ${newTheme} theme`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
          Settings
        </h1>
        <p className="text-text-muted">
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
                      ? "bg-accent-primary/20 text-accent-primary"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-secondary"
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
          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-primary to-accent-primary/50 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          showToast("success", "Avatar Updated", "Your profile picture has been updated");
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                    >
                      Change Avatar
                    </Button>
                    <p className="text-xs text-text-muted mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Phone</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary/50"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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
              <CardContent className="space-y-4">
                {[
                  { id: "storm" as const, label: "Storm Alerts", desc: "Get notified when severe weather affects your customers" },
                  { id: "leads" as const, label: "New Lead Assignments", desc: "When new leads are assigned to you" },
                  { id: "claims" as const, label: "Claim Updates", desc: "Status changes on insurance claims" },
                  { id: "tasks" as const, label: "Task Reminders", desc: "Upcoming tasks and follow-ups" },
                  { id: "team" as const, label: "Team Activity", desc: "Updates from your team members" },
                ].map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between p-4 bg-surface-secondary/50 rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium text-text-primary">{pref.label}</h4>
                      <p className="text-sm text-text-muted">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[pref.id]}
                        onChange={() => handleToggleNotification(pref.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-secondary peer-focus:ring-2 peer-focus:ring-accent-primary/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary border border-border"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "integrations" && (
            <>
              {/* CRM Integration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-accent-primary" />
                        CRM Integration
                      </CardTitle>
                      <CardDescription>
                        Connect your CRM to sync customer data automatically
                      </CardDescription>
                    </div>
                    <Badge variant="warning">Setup Required</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {crmIntegrations.map((crm) => (
                      <div
                        key={crm.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                          crm.id === "leap" 
                            ? "bg-accent-primary/5 border-accent-primary/30" 
                            : "bg-surface-secondary/30 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-secondary flex items-center justify-center text-2xl">
                            {crm.logo}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-text-primary">{crm.name}</h4>
                              {crm.id === "leap" && (
                                <Badge className="bg-accent-primary/20 text-accent-primary text-xs">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-text-muted">{crm.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {crm.url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(crm.url, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant={crm.id === "leap" ? "default" : "outline"} 
                            onClick={() => handleConnectCRM(crm.id, crm.name)}
                          >
                            {crm.status === "pending" ? "Complete Setup" : "Connect"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-accent-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-text-primary mb-1">Leap CRM Integration</h4>
                        <p className="text-sm text-text-muted">
                          Guardian uses Leap as their primary CRM. The integration adapter is ready - contact support with your Leap API credentials to complete the connection.
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
                        className="flex items-center justify-between p-4 bg-surface-secondary/30 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            integration.status === "connected" ? "bg-emerald-500" :
                            integration.status === "pending" ? "bg-amber-500" :
                            "bg-text-muted"
                          }`} />
                          <div>
                            <h4 className="font-medium text-text-primary">{integration.name}</h4>
                            <p className="text-sm text-text-muted">{integration.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {integration.lastSync && (
                            <span className="text-xs text-text-muted">
                              Last sync: {integration.lastSync}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {integration.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(integration.url, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncData(integration.name)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              Sync
                            </Button>
                          </div>
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
                  <div className="p-4 bg-surface-secondary/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-text-primary">Webhook Endpoint</h4>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCopyWebhook}>
                          <Copy className="w-4 h-4" />
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleRegenerateWebhook}>
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                    <code className="block p-3 bg-surface-primary rounded-lg text-sm text-accent-primary font-mono break-all">
                      {webhookUrl}
                    </code>
                    <p className="text-xs text-text-muted mt-2">
                      Use this URL to receive webhook events from your CRM and other services
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "api" && (
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access for integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-surface-secondary/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">Production Key</span>
                    <Badge variant={apiKey ? "success" : "secondary"}>
                      {apiKey ? "Active" : "Not Set"}
                    </Badge>
                  </div>
                  {apiKey ? (
                    <>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-surface-primary rounded-lg text-sm text-text-muted font-mono">
                          {showApiKey ? apiKey : apiKey.replace(/./g, "•").substring(0, 40) + "..."}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={handleCopyKey}>
                          <Copy className="w-4 h-4" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-rose-400 hover:text-rose-300 hover:border-rose-400" 
                          onClick={handleRevokeKey}
                        >
                          Revoke
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-text-muted">No API key configured. Generate one to enable API access.</p>
                  )}
                </div>
                
                <Button variant="outline" onClick={handleGenerateKey}>
                  <Key className="w-4 h-4" />
                  {apiKey ? "Regenerate Key" : "Generate New Key"}
                </Button>
                
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-text-primary mb-1">Security Notice</h4>
                      <p className="text-sm text-text-muted">
                        Keep your API key secure. Never share it publicly or commit it to version control. 
                        If compromised, revoke it immediately and generate a new one.
                      </p>
                    </div>
                  </div>
                </div>
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
                  <h4 className="text-sm font-medium text-text-primary mb-3">Theme</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: "dark" as const, label: "Dark", bg: "bg-[#0a0a0f]", preview: "bg-[#1a1a2e]" },
                      { id: "light" as const, label: "Light", bg: "bg-white", preview: "bg-gray-100" },
                      { id: "gray" as const, label: "Gray", bg: "bg-[#1f2937]", preview: "bg-[#374151]" },
                      { id: "light-gray" as const, label: "Light Gray", bg: "bg-[#d1d5db]", preview: "bg-[#9ca3af]" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                          theme === t.id 
                            ? "border-accent-primary bg-accent-primary/10" 
                            : "border-border hover:border-text-muted"
                        }`}
                      >
                        <div className={`w-full h-10 rounded ${t.bg} border border-border flex items-center justify-center`}>
                          <div className={`w-8 h-6 rounded ${t.preview}`} />
                        </div>
                        <span className={`text-xs ${theme === t.id ? "text-accent-primary" : "text-text-muted"}`}>
                          {t.label}
                        </span>
                        {theme === t.id && (
                          <Check className="w-4 h-4 text-accent-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-3">Accent Color</h4>
                  <div className="flex gap-3">
                    {[
                      { color: "#0ca5e9", name: "Cyan" },
                      { color: "#f97316", name: "Orange" },
                      { color: "#10b981", name: "Emerald" },
                      { color: "#8b5cf6", name: "Purple" },
                      { color: "#f43f5e", name: "Rose" },
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={() => {
                          setAccentColor(c.color);
                          showToast("info", "Coming Soon", "Custom accent colors will be available in a future update");
                        }}
                        className={`w-10 h-10 rounded-full transition-all hover:scale-110 ${
                          accentColor === c.color 
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface-primary" 
                            : ""
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    Custom accent colors coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Connect CRM Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConnectModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface-primary border border-border rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const crm = crmIntegrations.find(c => c.id === showConnectModal);
                if (!crm) return null;
                
                return (
                  <>
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                        <span className="text-2xl">{crm.logo}</span>
                        Connect {crm.name}
                      </h2>
                      <button onClick={() => setShowConnectModal(null)} className="p-2 hover:bg-surface-hover rounded">
                        <X className="w-5 h-5 text-text-muted" />
                      </button>
                    </div>
                    
                    <div className="p-6">
                      <p className="text-text-secondary mb-4">
                        {crm.id === "leap" 
                          ? "To connect Leap CRM, you'll need your API Key and Company ID from your Leap account settings."
                          : `Connect your ${crm.name} account to sync customer data, deals, and activities.`
                        }
                      </p>
                      
                      {crm.id === "leap" && (
                        <div className="space-y-4 mb-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Leap API Key</label>
                            <input
                              type="password"
                              placeholder="Enter your Leap API Key"
                              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Company ID</label>
                            <input
                              type="text"
                              placeholder="Enter your Leap Company ID"
                              className="w-full px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setShowConnectModal(null)}>
                          Cancel
                        </Button>
                        <Button className="flex-1" onClick={() => handleConfirmConnect(crm.id, crm.name)}>
                          <Database className="w-4 h-4" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
