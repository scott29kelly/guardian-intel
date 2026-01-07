"use client";

import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  CloudLightning,
  Phone,
  Target,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { CustomerIntelCard } from "@/components/customer-intel-card";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mockCustomers,
  mockIntelItems,
  mockWeatherEvents,
  mockDailyMetrics,
  mockPipelineData,
  mockWeeklyTrend,
} from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export default function Dashboard() {
  // Sort customers by lead score (highest first)
  const prioritizedCustomers = [...mockCustomers].sort(
    (a, b) => b.leadScore - a.leadScore
  );

  // Get customers with intel items
  const getCustomerIntel = (customerId: string) =>
    mockIntelItems.filter((i) => i.customerId === customerId);

  const getCustomerWeather = (customerId: string) =>
    mockWeatherEvents.filter((w) => w.customerId === customerId);

  return (
    <div className="min-h-screen">
      <Sidebar />

      {/* Main Content - offset by sidebar width */}
      <main className="ml-[260px] p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-[1600px] mx-auto space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-white mb-2">
                Command Center
              </h1>
              <p className="text-surface-400">
                Welcome back, Sarah. You have{" "}
                <span className="text-accent-400 font-semibold">3 critical alerts</span>{" "}
                requiring attention.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success" className="px-3 py-1.5">
                <Zap className="w-3.5 h-3.5 mr-1" />
                Storm Season Active
              </Badge>
              <Button>
                <Phone className="w-4 h-4" />
                Start Power Hour
              </Button>
            </div>
          </motion.div>

          {/* KPI Metrics Row */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <MetricCard
              title="Active Leads"
              value={mockDailyMetrics.qualifiedLeads}
              change={12}
              changeLabel="vs last week"
              trend="up"
              icon={Users}
              glowColor="primary"
            />
            <MetricCard
              title="Pipeline Value"
              value={formatCurrency(mockPipelineData.reduce((sum, s) => sum + s.value, 0))}
              change={8}
              changeLabel="vs last week"
              trend="up"
              icon={DollarSign}
              glowColor="success"
            />
            <MetricCard
              title="Storm Leads"
              value={mockDailyMetrics.stormLeads}
              change={45}
              changeLabel="new this week"
              trend="up"
              icon={CloudLightning}
              glowColor="accent"
            />
            <MetricCard
              title="Close Rate"
              value="28%"
              change={3}
              changeLabel="vs last month"
              trend="up"
              icon={Target}
              glowColor="primary"
            />
          </motion.div>

          {/* Charts Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-guardian-400" />
                  Weekly Activity
                </CardTitle>
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <TrendChart data={mockWeeklyTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Pipeline by Stage
                </CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <PipelineChart data={mockPipelineData} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Priority Intel Section */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Priority Customers
                </h2>
                <p className="text-sm text-surface-400">
                  Ranked by lead score and actionable intel
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Sort by: Lead Score
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {prioritizedCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CustomerIntelCard
                    customer={customer}
                    intelItems={getCustomerIntel(customer.id)}
                    weatherEvents={getCustomerWeather(customer.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
