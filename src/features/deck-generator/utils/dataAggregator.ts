/**
 * Data Aggregator for Deck Generation
 * 
 * Each function fetches and formats data for specific slide types.
 * These integrate with the existing Guardian Intel APIs and database.
 */

import type {
  TitleSlideContent, 
  StatsSlideContent, 
  ListSlideContent,
  TimelineSlideContent,
  ImageSlideContent,
  TalkingPointsSlideContent,
  ChartSlideContent,
  ComparisonSlideContent,
} from '../types/deck.types';

// =============================================================================
// CUSTOMER CHEAT SHEET DATA FUNCTIONS
// =============================================================================

export async function getCustomerTitleData(customerId: string): Promise<TitleSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: `Customer Prep: ${customer.firstName} ${customer.lastName}`,
      subtitle: `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`,
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preparedFor: customer.assignedRep?.name || 'Guardian Sales Team',
    };
  } catch {
    return {
      title: 'Customer Prep',
      subtitle: 'Customer details unavailable',
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }
}

export async function getCustomerOverviewStats(customerId: string): Promise<StatsSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: 'Customer At-A-Glance',
      stats: [
        { 
          label: 'Lead Score', 
          value: customer.leadScore || 0, 
          trend: customer.leadScore > 70 ? 'up' : customer.leadScore > 40 ? 'neutral' : 'down',
          icon: 'Target'
        },
        { 
          label: 'Property Value', 
          value: customer.propertyValue ? `$${customer.propertyValue.toLocaleString()}` : 'N/A',
          icon: 'Home'
        },
        { 
          label: 'Roof Age', 
          value: customer.roofAge ? `${customer.roofAge} years` : 'Unknown',
          icon: 'Calendar'
        },
        { 
          label: 'Urgency Score', 
          value: customer.urgencyScore || 0,
          trend: customer.urgencyScore > 70 ? 'up' : 'neutral',
          icon: 'Zap'
        },
      ],
      footnote: `Last updated: ${new Date().toLocaleDateString()}`
    };
  } catch {
    return {
      title: 'Customer At-A-Glance',
      stats: [
        { label: 'Lead Score', value: 'N/A', icon: 'Target' },
        { label: 'Property Value', value: 'N/A', icon: 'Home' },
        { label: 'Roof Age', value: 'N/A', icon: 'Calendar' },
        { label: 'Urgency Score', value: 'N/A', icon: 'Zap' },
      ],
    };
  }
}

export async function getPropertyIntelData(customerId: string): Promise<ImageSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    const address = `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`;
    
    // Use property service for street view if available
    const streetViewUrl = `/api/property/street-view?address=${encodeURIComponent(address)}`;
    
    const notes: string[] = [];
    if (customer.roofAge) notes.push(`Roof installed ~${customer.roofAge} years ago`);
    if (customer.roofType) notes.push(`Roof type: ${customer.roofType}`);
    if (customer.propertyType) notes.push(`Property type: ${customer.propertyType}`);
    if (customer.squareFootage) notes.push(`${customer.squareFootage.toLocaleString()} sq ft`);
    
    return {
      title: 'Property Intelligence',
      imageUrl: streetViewUrl,
      altText: `Street view of ${address}`,
      caption: [
        customer.propertyType || 'Single Family',
        customer.squareFootage ? `${customer.squareFootage.toLocaleString()} sq ft` : null,
        customer.roofType || null,
      ].filter(Boolean).join(' | '),
      notes,
    };
  } catch {
    return {
      title: 'Property Intelligence',
      imageUrl: '/placeholder-property.svg',
      altText: 'Property image unavailable',
      caption: 'Property details unavailable',
      notes: [],
    };
  }
}

export async function getStormHistoryTimeline(customerId: string): Promise<TimelineSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}/weather-events`);
    if (!response.ok) throw new Error('Failed to fetch weather events');
    const data = await response.json();
    const storms = data.weatherEvents || [];
    
    return {
      title: 'Storm Exposure History',
      events: storms.slice(0, 5).map((storm: {
        eventDate: string;
        eventType: string;
        severity?: string;
        hailSize?: number;
        windSpeed?: number;
        claimFiled?: boolean;
      }) => ({
        date: new Date(storm.eventDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        title: storm.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: [
          storm.severity ? `Severity: ${storm.severity}` : null,
          storm.hailSize ? `Hail: ${storm.hailSize}"` : null,
          storm.windSpeed ? `Wind: ${storm.windSpeed} mph` : null,
        ].filter(Boolean).join(' | ') || undefined,
        status: storm.claimFiled ? 'completed' : 'upcoming',
        icon: storm.eventType.includes('hail') ? 'CloudHail' : 'Wind',
      })),
    };
  } catch {
    return {
      title: 'Storm Exposure History',
      events: [
        {
          date: 'No data',
          title: 'No storm events found',
          description: 'No recent storm activity recorded for this property',
          status: 'upcoming',
        }
      ],
    };
  }
}

// =============================================================================
// AI-ENHANCED DATA FUNCTIONS
// =============================================================================

export async function generateCustomerTalkingPoints(customerId: string): Promise<TalkingPointsSlideContent> {
  try {
    // Fetch customer data first
    const customerResponse = await fetch(`/api/customers/${customerId}`);
    if (!customerResponse.ok) throw new Error('Failed to fetch customer');
    const customerData = await customerResponse.json();
    const customer = customerData.customer;

    // Generate talking points based on customer data
    const points = [];
    
    // Opening based on lead source or storm history
    points.push({
      topic: 'Opening',
      script: customer.leadSource === 'storm' 
        ? `Hi ${customer.firstName}, I'm with Guardian Storm Repair. We noticed significant storm activity in your area recently. Have you had a chance to check your roof for damage?`
        : `Hi ${customer.firstName}, I'm with Guardian Storm Repair. We specialize in roof inspections and repairs in the ${customer.city} area.`,
      priority: 'high' as const,
    });

    // Value proposition based on property
    if (customer.roofAge && customer.roofAge > 15) {
      points.push({
        topic: 'Roof Age Opportunity',
        script: `Based on our records, your roof may be around ${customer.roofAge} years old. Most roofs have a 20-25 year lifespan, so this is an excellent time for a free inspection to assess its condition.`,
        priority: 'high' as const,
      });
    }

    // Insurance angle
    if (customer.insuranceCarrier) {
      points.push({
        topic: 'Insurance Angle',
        script: `I see you're with ${customer.insuranceCarrier}. We work with them frequently and know their process well. Many homeowners don't realize storm damage is covered.`,
        priority: 'medium' as const,
      });
    }

    // Closing
    points.push({
      topic: 'Call to Action',
      script: 'I\'d like to offer you a free, no-obligation roof inspection. We can document any damage and help you understand your options. What day works best for you?',
      priority: 'high' as const,
    });

    return {
      title: 'Recommended Talking Points',
      aiGenerated: true,
      points,
    };
  } catch {
    return {
      title: 'Recommended Talking Points',
      aiGenerated: true,
      points: [
        {
          topic: 'Opening',
          script: 'Introduce yourself and Guardian Storm Repair, mention any recent storm activity in the area.',
          priority: 'high',
        },
        {
          topic: 'Value Proposition',
          script: 'Offer free no-obligation roof inspection, emphasize expertise in storm damage.',
          priority: 'medium',
        },
        {
          topic: 'Call to Action',
          script: 'Schedule the inspection - ask what day works best for them.',
          priority: 'high',
        },
      ],
    };
  }
}

export async function generateObjectionHandlers(customerId: string): Promise<ListSlideContent> {
  // Standard objection handlers that can be customized based on customer data
  void customerId; // Acknowledge the parameter even if not used
  
  return {
    title: 'Objection Handlers',
    items: [
      {
        primary: '"I need to think about it"',
        secondary: 'I completely understand. The inspection itself is completely free and no-obligation. It just gives you information about your home\'s condition so you can make an informed decision.',
        highlight: true,
      },
      {
        primary: '"I\'m getting other quotes"',
        secondary: 'That\'s smart to compare. What sets us apart is our direct experience with insurance claims - we help maximize your coverage and handle the paperwork.',
        highlight: false,
      },
      {
        primary: '"I don\'t think I have damage"',
        secondary: 'Many homeowners are surprised by what we find. Storm damage isn\'t always visible from the ground. A quick 20-minute inspection gives you peace of mind either way.',
        highlight: false,
      },
      {
        primary: '"My insurance rates will go up"',
        secondary: 'Actually, weather damage claims typically don\'t affect your rates because they\'re not your fault. You\'re paying for this coverage - you should use it when you need it.',
        highlight: true,
      },
      {
        primary: '"I can\'t afford the deductible"',
        secondary: 'We offer flexible payment plans and can work with most budgets. The important thing is to document the damage before the claim deadline passes.',
        highlight: false,
      },
    ],
    numbered: false,
  };
}

export async function getRecommendedNextSteps(customerId: string): Promise<ListSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;

    const items = [];

    // Based on customer stage
    if (customer.stage === 'new' || customer.stage === 'contacted') {
      items.push({
        primary: 'Schedule initial inspection',
        secondary: 'Confirm appointment time and send calendar invite',
        icon: 'Calendar',
        highlight: true,
      });
    }

    if (customer.stage === 'qualified') {
      items.push({
        primary: 'Prepare detailed proposal',
        secondary: 'Include scope of work and financing options',
        icon: 'FileText',
        highlight: true,
      });
    }

    // Always include follow-up
    items.push({
      primary: 'Follow-up call within 48 hours',
      secondary: 'Confirm they received materials and answer questions',
      icon: 'Phone',
      highlight: false,
    });

    // Add note about insurance if applicable
    if (customer.insuranceCarrier) {
      items.push({
        primary: 'Review insurance policy details',
        secondary: `Confirm coverage with ${customer.insuranceCarrier}`,
        icon: 'Shield',
        highlight: false,
      });
    }

    return {
      title: 'Recommended Next Steps',
      items,
      numbered: true,
    };
  } catch {
    return {
      title: 'Recommended Next Steps',
      items: [
        { primary: 'Schedule inspection', secondary: 'Set up on-site visit', icon: 'Calendar', highlight: true },
        { primary: 'Follow up within 48 hours', secondary: 'Answer questions and confirm interest', icon: 'Phone' },
        { primary: 'Send information packet', secondary: 'Company info and testimonials', icon: 'Mail' },
      ],
      numbered: true,
    };
  }
}

// =============================================================================
// PROJECT TIMELINE DATA FUNCTIONS
// =============================================================================

export async function getProjectTitleData(customerId: string): Promise<TitleSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: `Project Update: ${customer.firstName} ${customer.lastName}`,
      subtitle: `${customer.address}, ${customer.city}, ${customer.state}`,
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preparedFor: `${customer.firstName} ${customer.lastName}`,
      preparedBy: 'Guardian Storm Repair',
    };
  } catch {
    return {
      title: 'Project Update',
      subtitle: 'Project details',
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }
}

export async function getProjectStats(customerId: string): Promise<StatsSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: 'Project Overview',
      stats: [
        { 
          label: 'Contract Value', 
          value: customer.estimatedJobValue ? `$${customer.estimatedJobValue.toLocaleString()}` : 'TBD',
          icon: 'DollarSign'
        },
        { 
          label: 'Project Stage', 
          value: customer.stage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'In Progress',
          icon: 'Flag'
        },
        { 
          label: 'Status', 
          value: customer.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Active',
          icon: 'CheckCircle'
        },
        { 
          label: 'Last Updated', 
          value: new Date(customer.updatedAt).toLocaleDateString(),
          icon: 'Clock'
        },
      ],
    };
  } catch {
    return {
      title: 'Project Overview',
      stats: [
        { label: 'Contract Value', value: 'TBD', icon: 'DollarSign' },
        { label: 'Project Stage', value: 'In Progress', icon: 'Flag' },
        { label: 'Status', value: 'Active', icon: 'CheckCircle' },
        { label: 'Last Updated', value: new Date().toLocaleDateString(), icon: 'Clock' },
      ],
    };
  }
}

export async function getProjectTimeline(customerId: string): Promise<TimelineSlideContent> {
  void customerId;
  
  // Standard project timeline (would be populated from actual project data)
  return {
    title: 'Project Timeline',
    events: [
      {
        date: 'Week 1',
        title: 'Initial Inspection',
        description: 'Property assessment and damage documentation',
        status: 'completed',
        icon: 'ClipboardCheck',
      },
      {
        date: 'Week 2',
        title: 'Insurance Claim Filed',
        description: 'Claim submitted with documentation',
        status: 'completed',
        icon: 'FileText',
      },
      {
        date: 'Week 3',
        title: 'Adjuster Meeting',
        description: 'On-site meeting with insurance adjuster',
        status: 'current',
        icon: 'Users',
      },
      {
        date: 'Week 4-5',
        title: 'Material Order & Scheduling',
        description: 'Materials ordered, crew scheduled',
        status: 'upcoming',
        icon: 'Package',
      },
      {
        date: 'Week 6',
        title: 'Installation Complete',
        description: 'Roof replacement completed',
        status: 'upcoming',
        icon: 'Home',
      },
    ],
  };
}

export async function getUpcomingTasks(customerId: string): Promise<ListSlideContent> {
  void customerId;
  
  return {
    title: 'Upcoming Tasks',
    items: [
      {
        primary: 'Adjuster meeting scheduled',
        secondary: 'Be present for on-site inspection',
        icon: 'Calendar',
        highlight: true,
      },
      {
        primary: 'Material selection',
        secondary: 'Choose shingle color and style',
        icon: 'Palette',
      },
      {
        primary: 'HOA approval (if applicable)',
        secondary: 'Submit color selection to HOA',
        icon: 'Building',
      },
      {
        primary: 'Pre-installation prep',
        secondary: 'Clear driveway and protect landscaping',
        icon: 'Shield',
      },
    ],
    numbered: true,
  };
}

export async function getWeatherForecast(): Promise<ChartSlideContent> {
  // Would integrate with weather API
  return {
    title: '7-Day Weather Outlook',
    chartType: 'bar',
    data: [
      { day: 'Mon', precip: 10, temp: 72 },
      { day: 'Tue', precip: 5, temp: 74 },
      { day: 'Wed', precip: 0, temp: 76 },
      { day: 'Thu', precip: 0, temp: 75 },
      { day: 'Fri', precip: 20, temp: 73 },
      { day: 'Sat', precip: 30, temp: 70 },
      { day: 'Sun', precip: 15, temp: 72 },
    ],
    xKey: 'day',
    yKey: 'precip',
    footnote: 'Precipitation chance (%). Best install days: Wed-Thu',
  };
}

// =============================================================================
// TEAM/LEADERSHIP DATA FUNCTIONS
// =============================================================================

export async function getTeamReportTitleData(): Promise<TitleSlideContent> {
  return {
    title: 'Team Performance Report',
    subtitle: 'Guardian Storm Repair Sales Team',
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Leadership Team',
    preparedBy: 'Guardian Intel',
  };
}

export async function getTeamKPIStats(
  teamId?: string, 
  dateRange?: { start: string; end: string }
): Promise<StatsSlideContent> {
  void teamId;
  void dateRange;
  
  try {
    const response = await fetch('/api/analytics/dashboard');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await response.json();
    
    return {
      title: 'Key Performance Metrics',
      stats: [
        { 
          label: 'Revenue MTD', 
          value: data.revenueMTD ? `$${data.revenueMTD.toLocaleString()}` : '$0',
          trend: 'up',
          change: '+12%',
          icon: 'DollarSign'
        },
        { 
          label: 'Deals Closed', 
          value: data.dealsClosed || 0,
          trend: 'up',
          icon: 'CheckCircle'
        },
        { 
          label: 'Conversion Rate', 
          value: data.conversionRate ? `${data.conversionRate}%` : '0%',
          trend: 'neutral',
          icon: 'TrendingUp'
        },
        { 
          label: 'Avg Deal Size', 
          value: data.avgDealSize ? `$${data.avgDealSize.toLocaleString()}` : '$0',
          icon: 'Maximize'
        },
      ],
    };
  } catch {
    return {
      title: 'Key Performance Metrics',
      stats: [
        { label: 'Revenue MTD', value: 'Loading...', icon: 'DollarSign' },
        { label: 'Deals Closed', value: 'Loading...', icon: 'CheckCircle' },
        { label: 'Conversion Rate', value: 'Loading...', icon: 'TrendingUp' },
        { label: 'Avg Deal Size', value: 'Loading...', icon: 'Maximize' },
      ],
    };
  }
}

export async function getLeaderboardData(teamId?: string): Promise<ListSlideContent> {
  void teamId;
  
  try {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    const users = data.users || [];
    
    const sortedUsers = users
      .filter((u: { role: string }) => u.role === 'rep')
      .sort((a: { totalRevenue: number }, b: { totalRevenue: number }) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, 5);
    
    return {
      title: 'Top Performers',
      items: sortedUsers.map((rep: { 
        name: string; 
        totalRevenue: number; 
        totalDeals: number; 
        closeRate: number 
      }, index: number) => ({
        primary: `${index + 1}. ${rep.name}`,
        secondary: `$${(rep.totalRevenue || 0).toLocaleString()} | ${rep.totalDeals || 0} deals | ${rep.closeRate || 0}% close rate`,
        icon: index === 0 ? 'Trophy' : index < 3 ? 'Medal' : 'User',
        highlight: index === 0,
      })),
      numbered: false,
    };
  } catch {
    return {
      title: 'Top Performers',
      items: [
        { primary: '1. Loading...', secondary: 'Fetching data', icon: 'User' },
      ],
      numbered: false,
    };
  }
}

export async function getRevenueTrendData(
  teamId?: string, 
  dateRange?: { start: string; end: string }
): Promise<ChartSlideContent> {
  void teamId;
  void dateRange;
  
  // Would fetch from analytics API
  return {
    title: 'Revenue Trend',
    chartType: 'area',
    data: [
      { date: 'Week 1', revenue: 45000 },
      { date: 'Week 2', revenue: 52000 },
      { date: 'Week 3', revenue: 48000 },
      { date: 'Week 4', revenue: 61000 },
    ],
    xKey: 'date',
    yKey: 'revenue',
    footnote: 'Weekly revenue for current period',
  };
}

export async function getCoachingOpportunities(): Promise<ListSlideContent> {
  return {
    title: 'Coaching Opportunities',
    items: [
      {
        primary: 'Improve Quote-to-Close Time',
        secondary: 'Average 12 days vs target 7 days. Review follow-up cadence.',
        icon: 'Clock',
        highlight: true,
      },
      {
        primary: 'Increase Inspection Conversion',
        secondary: 'Currently 45% conversion from inspection to proposal.',
        icon: 'TrendingUp',
      },
      {
        primary: 'Supplement Training Needed',
        secondary: 'Team averaging 1.2 supplements vs top performers at 2.1',
        icon: 'FileText',
      },
    ],
    numbered: false,
  };
}

export async function getPipelineHealthData(): Promise<ChartSlideContent> {
  return {
    title: 'Pipeline Health',
    chartType: 'bar',
    data: [
      { stage: 'New Leads', count: 45, value: 450000 },
      { stage: 'Contacted', count: 32, value: 320000 },
      { stage: 'Qualified', count: 24, value: 360000 },
      { stage: 'Proposal', count: 18, value: 324000 },
      { stage: 'Negotiation', count: 8, value: 168000 },
    ],
    xKey: 'stage',
    yKey: 'count',
    footnote: 'Deals by stage with estimated value',
  };
}

export async function generatePerformanceInsights(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'AI Insights & Recommendations',
    aiGenerated: true,
    points: [
      {
        topic: 'Opportunity',
        script: 'Storm season peak approaching. Recommend increasing canvassing capacity by 20% in high-activity zip codes.',
        priority: 'high',
      },
      {
        topic: 'Risk',
        script: 'Lead response time has increased to 4.2 hours average. Fast response correlates with 2x higher close rates.',
        priority: 'high',
      },
      {
        topic: 'Optimization',
        script: 'Top performers spend 40% more time on insurance prep. Consider mandatory adjuster meeting training.',
        priority: 'medium',
      },
    ],
  };
}

// =============================================================================
// STORM DATA FUNCTIONS
// =============================================================================

export async function getStormBriefTitleData(regionId?: string): Promise<TitleSlideContent> {
  void regionId;
  
  return {
    title: 'Storm Response Deployment Brief',
    subtitle: 'Immediate Action Required',
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Field Operations Team',
    preparedBy: 'Guardian Intel Storm Watch',
  };
}

export async function getStormImpactStats(regionId?: string): Promise<StatsSlideContent> {
  void regionId;
  
  try {
    const response = await fetch('/api/storms/active');
    if (!response.ok) throw new Error('Failed to fetch storm data');
    const data = await response.json();
    
    return {
      title: 'Storm Impact Summary',
      stats: [
        { 
          label: 'Properties Affected', 
          value: data.propertiesAffected || 0, 
          icon: 'Home' 
        },
        { 
          label: 'Estimated Opportunity', 
          value: data.estimatedOpportunity ? `$${data.estimatedOpportunity.toLocaleString()}` : '$0', 
          icon: 'DollarSign' 
        },
        { 
          label: 'Severity Level', 
          value: data.severityLevel || 'Moderate', 
          icon: 'AlertTriangle' 
        },
        { 
          label: 'Priority Leads', 
          value: data.priorityLeads || 0, 
          icon: 'Star' 
        },
      ],
    };
  } catch {
    return {
      title: 'Storm Impact Summary',
      stats: [
        { label: 'Properties Affected', value: 'Calculating...', icon: 'Home' },
        { label: 'Estimated Opportunity', value: 'Calculating...', icon: 'DollarSign' },
        { label: 'Severity Level', value: 'Assessing...', icon: 'AlertTriangle' },
        { label: 'Priority Leads', value: 'Calculating...', icon: 'Star' },
      ],
    };
  }
}

export async function getAffectedAreaMap(): Promise<ImageSlideContent> {
  return {
    title: 'Affected Area Map',
    imageUrl: '/api/maps/storm-impact',
    altText: 'Storm impact area map',
    caption: 'Red zones indicate highest damage probability',
    notes: [
      'Focus canvassing on marked hot zones',
      'Avoid flooded roads in southern sector',
    ],
  };
}

export async function getPriorityStormLeads(regionId?: string): Promise<ListSlideContent> {
  void regionId;
  
  try {
    const response = await fetch('/api/customers?limit=10&sort=urgencyScore&order=desc');
    if (!response.ok) throw new Error('Failed to fetch leads');
    const data = await response.json();
    const leads = data.data || [];
    
    return {
      title: 'Priority Leads',
      items: leads.slice(0, 10).map((lead: {
        firstName: string;
        lastName: string;
        address: string;
        urgencyScore: number;
        profitPotential: number;
      }) => ({
        primary: `${lead.firstName} ${lead.lastName}`,
        secondary: `${lead.address} | Score: ${lead.urgencyScore} | Est. Value: $${(lead.profitPotential || 0).toLocaleString()}`,
        icon: lead.urgencyScore > 80 ? 'Flame' : 'Target',
        highlight: lead.urgencyScore > 80,
      })),
      numbered: true,
    };
  } catch {
    return {
      title: 'Priority Leads',
      items: [
        { primary: 'Loading leads...', secondary: 'Calculating priority scores', icon: 'Loader' },
      ],
      numbered: true,
    };
  }
}

export async function getTeamAssignments(): Promise<ListSlideContent> {
  return {
    title: 'Team Deployment Plan',
    items: [
      {
        primary: 'Zone A - Downtown',
        secondary: 'Assign 2 reps | 45 properties | High priority',
        icon: 'MapPin',
        highlight: true,
      },
      {
        primary: 'Zone B - Suburbs North',
        secondary: 'Assign 2 reps | 62 properties | Medium priority',
        icon: 'MapPin',
      },
      {
        primary: 'Zone C - Suburbs South',
        secondary: 'Assign 1 rep | 28 properties | Standard priority',
        icon: 'MapPin',
      },
    ],
    numbered: false,
  };
}

export async function generateStormTalkingPoints(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Storm Response Scripts',
    aiGenerated: true,
    points: [
      {
        topic: 'Immediate Opener',
        script: 'Hi, I\'m with Guardian Storm Repair. We\'re in your neighborhood helping homeowners assess damage from the recent storm. Have you had a chance to check your roof?',
        priority: 'high',
      },
      {
        topic: 'Urgency Creator',
        script: 'Insurance claims have a time limit, and with this many properties affected, adjusters are booking up fast. Getting an early inspection gives you priority scheduling.',
        priority: 'high',
      },
      {
        topic: 'Social Proof',
        script: 'We\'ve already found significant damage at several homes on this street. Many homeowners don\'t realize their roof is compromised until it starts leaking.',
        priority: 'medium',
      },
    ],
  };
}

export async function getLogisticsChecklist(): Promise<ListSlideContent> {
  return {
    title: 'Logistics & Materials',
    items: [
      { primary: 'Business cards (100+)', secondary: 'Per rep', icon: 'CreditCard' },
      { primary: 'Leave-behind packets', secondary: 'Company info, testimonials, insurance guide', icon: 'FileText' },
      { primary: 'Tablet/Phone charged', secondary: 'For photo documentation', icon: 'Smartphone' },
      { primary: 'Ladder', secondary: 'For roof access if permitted', icon: 'ArrowUp' },
      { primary: 'Safety gear', secondary: 'Vest, hard hat for site visits', icon: 'Shield' },
      { primary: 'Route maps printed', secondary: 'Backup for GPS issues', icon: 'Map' },
    ],
    numbered: true,
  };
}

// =============================================================================
// INSURANCE PREP DATA FUNCTIONS
// =============================================================================

export async function getInsurancePrepTitleData(customerId: string): Promise<TitleSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: `Adjuster Meeting Prep`,
      subtitle: `${customer.firstName} ${customer.lastName} | ${customer.insuranceCarrier || 'Insurance Carrier'}`,
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preparedFor: customer.assignedRep?.name || 'Sales Rep',
    };
  } catch {
    return {
      title: 'Adjuster Meeting Prep',
      subtitle: 'Customer details',
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }
}

export async function getClaimOverviewStats(customerId: string): Promise<StatsSlideContent> {
  void customerId;
  
  return {
    title: 'Claim Overview',
    stats: [
      { label: 'Claim Number', value: 'CLM-2026-XXXXX', icon: 'FileText' },
      { label: 'Date of Loss', value: 'Jan 15, 2026', icon: 'Calendar' },
      { label: 'Estimated Value', value: '$18,500', icon: 'DollarSign' },
      { label: 'Deductible', value: '$1,000', icon: 'Wallet' },
    ],
  };
}

export async function getDamageDocumentation(): Promise<ListSlideContent> {
  return {
    title: 'Documented Damage',
    items: [
      { primary: 'Roof shingle damage', secondary: '24 damaged shingles, north slope', icon: 'Home', highlight: true },
      { primary: 'Ridge cap damage', secondary: '12 LF ridge cap needs replacement', icon: 'Ruler' },
      { primary: 'Gutter dents', secondary: 'Multiple impact dents, east side', icon: 'Droplet' },
      { primary: 'Soffit damage', secondary: 'Minor damage, 2 panels affected', icon: 'Box' },
    ],
    numbered: true,
  };
}

export async function getCarrierIntel(customerId: string): Promise<StatsSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const carrier = data.customer?.insuranceCarrier || 'Unknown';
    
    return {
      title: `${carrier} Intelligence`,
      stats: [
        { label: 'Approval Rate', value: '78%', trend: 'up', icon: 'CheckCircle' },
        { label: 'Avg Processing Time', value: '14 days', icon: 'Clock' },
        { label: 'Supplement Success', value: '85%', icon: 'FileText' },
        { label: 'Difficulty Rating', value: 'Medium', icon: 'AlertTriangle' },
      ],
      footnote: 'Based on last 50 claims with this carrier',
    };
  } catch {
    return {
      title: 'Carrier Intelligence',
      stats: [
        { label: 'Approval Rate', value: 'N/A', icon: 'CheckCircle' },
        { label: 'Avg Processing Time', value: 'N/A', icon: 'Clock' },
        { label: 'Supplement Success', value: 'N/A', icon: 'FileText' },
        { label: 'Difficulty Rating', value: 'N/A', icon: 'AlertTriangle' },
      ],
    };
  }
}

export async function generateNegotiationPoints(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Key Negotiation Points',
    aiGenerated: true,
    points: [
      {
        topic: 'Code Upgrades',
        script: 'Current code requires ice & water shield in valleys. This wasn\'t standard when the roof was installed, so it should be included as a code upgrade.',
        priority: 'high',
      },
      {
        topic: 'Hidden Damage',
        script: 'Request decking inspection. Impact damage often causes fractures not visible until shingles are removed.',
        priority: 'high',
      },
      {
        topic: 'Material Match',
        script: 'Manufacturer has discontinued this shingle line. Full replacement may be required to maintain uniform appearance.',
        priority: 'medium',
      },
    ],
  };
}

export async function getDocumentationChecklist(): Promise<ListSlideContent> {
  return {
    title: 'Pre-Meeting Checklist',
    items: [
      { primary: 'Damage photos printed', secondary: 'Before/after, multiple angles', icon: 'Camera', highlight: true },
      { primary: 'Scope of work document', secondary: 'Detailed line items', icon: 'FileText' },
      { primary: 'Weather report', secondary: 'Storm date and conditions', icon: 'Cloud' },
      { primary: 'Policy copy', secondary: 'Coverage limits and exclusions', icon: 'Shield' },
      { primary: 'Ladder on site', secondary: 'For roof access', icon: 'ArrowUp' },
    ],
    numbered: true,
  };
}

// =============================================================================
// MARKET ANALYSIS DATA FUNCTIONS
// =============================================================================

export async function getMarketAnalysisTitleData(regionId?: string): Promise<TitleSlideContent> {
  void regionId;
  
  return {
    title: 'Market Analysis Brief',
    subtitle: 'Mid-Atlantic Region | Storm Damage Market',
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Leadership Team',
    preparedBy: 'Guardian Intel Analytics',
  };
}

export async function getMarketOverviewStats(): Promise<StatsSlideContent> {
  return {
    title: 'Market Overview',
    stats: [
      { label: 'Total Addressable Market', value: '$45M', icon: 'DollarSign' },
      { label: 'Market Penetration', value: '12%', trend: 'up', change: '+2%', icon: 'TrendingUp' },
      { label: 'Active Leads', value: '2,340', icon: 'Users' },
      { label: 'YoY Growth', value: '+18%', trend: 'up', icon: 'ArrowUp' },
    ],
  };
}

export async function getStormActivityTrend(): Promise<ChartSlideContent> {
  return {
    title: 'Storm Activity Trends',
    chartType: 'line',
    data: [
      { month: 'Jan', events: 3, severity: 2.1 },
      { month: 'Feb', events: 2, severity: 1.8 },
      { month: 'Mar', events: 5, severity: 2.5 },
      { month: 'Apr', events: 8, severity: 3.2 },
      { month: 'May', events: 12, severity: 3.8 },
      { month: 'Jun', events: 15, severity: 4.1 },
    ],
    xKey: 'month',
    yKey: 'events',
    footnote: 'Storm frequency and average severity index',
  };
}

export async function getOpportunityHeatMap(): Promise<ImageSlideContent> {
  return {
    title: 'Opportunity Heat Map',
    imageUrl: '/api/maps/opportunity-heatmap',
    altText: 'Market opportunity heat map',
    caption: 'Darker areas indicate higher opportunity density',
    notes: [
      'Highest concentration in 191xx zip codes',
      'Emerging opportunity in 194xx area',
    ],
  };
}

export async function getCompetitiveLandscape(): Promise<ComparisonSlideContent> {
  return {
    title: 'Competitive Landscape',
    columns: [
      {
        header: 'Guardian Strengths',
        items: [
          'Insurance claim expertise',
          'Faster response time (< 2 hrs)',
          'Local presence in 5 counties',
          'AI-powered lead scoring',
        ],
      },
      {
        header: 'Market Threats',
        items: [
          'National chains entering market',
          'Price competition from smaller contractors',
          'DIY repair trend for minor damage',
          'Insurance claim processing delays',
        ],
      },
    ],
  };
}

export async function generateStrategicRecommendations(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Strategic Recommendations',
    aiGenerated: true,
    points: [
      {
        topic: 'Expansion Opportunity',
        script: 'Analysis indicates underserved market in southern Delaware. Recommend pilot expansion with 2 reps.',
        priority: 'high',
      },
      {
        topic: 'Competitive Defense',
        script: 'National chain entering market Q2. Accelerate customer loyalty program and referral incentives.',
        priority: 'high',
      },
      {
        topic: 'Technology Investment',
        script: 'Drone inspection capability would reduce assessment time by 60% and differentiate from competitors.',
        priority: 'medium',
      },
    ],
  };
}

// =============================================================================
// UTILITY: Data Source Registry
// =============================================================================

// Map of all data source functions for dynamic calling
export const dataSourceRegistry: Record<string, (context: Record<string, unknown>) => Promise<unknown>> = {
  // Customer Cheat Sheet
  getCustomerTitleData: (ctx) => getCustomerTitleData(ctx.customerId as string),
  getCustomerOverviewStats: (ctx) => getCustomerOverviewStats(ctx.customerId as string),
  getPropertyIntelData: (ctx) => getPropertyIntelData(ctx.customerId as string),
  getStormHistoryTimeline: (ctx) => getStormHistoryTimeline(ctx.customerId as string),
  generateCustomerTalkingPoints: (ctx) => generateCustomerTalkingPoints(ctx.customerId as string),
  generateObjectionHandlers: (ctx) => generateObjectionHandlers(ctx.customerId as string),
  getRecommendedNextSteps: (ctx) => getRecommendedNextSteps(ctx.customerId as string),
  
  // Project Timeline
  getProjectTitleData: (ctx) => getProjectTitleData(ctx.customerId as string),
  getProjectStats: (ctx) => getProjectStats(ctx.customerId as string),
  getProjectTimeline: (ctx) => getProjectTimeline(ctx.customerId as string),
  getUpcomingTasks: (ctx) => getUpcomingTasks(ctx.customerId as string),
  getWeatherForecast: () => getWeatherForecast(),
  
  // Team Performance
  getTeamReportTitleData: () => getTeamReportTitleData(),
  getTeamKPIStats: (ctx) => getTeamKPIStats(ctx.teamId as string | undefined, ctx.dateRange as { start: string; end: string } | undefined),
  getLeaderboardData: (ctx) => getLeaderboardData(ctx.teamId as string | undefined),
  getRevenueTrendData: (ctx) => getRevenueTrendData(ctx.teamId as string | undefined, ctx.dateRange as { start: string; end: string } | undefined),
  getCoachingOpportunities: () => getCoachingOpportunities(),
  getPipelineHealthData: () => getPipelineHealthData(),
  generatePerformanceInsights: () => generatePerformanceInsights(),
  
  // Storm Deployment
  getStormBriefTitleData: (ctx) => getStormBriefTitleData(ctx.regionId as string | undefined),
  getStormImpactStats: (ctx) => getStormImpactStats(ctx.regionId as string | undefined),
  getAffectedAreaMap: () => getAffectedAreaMap(),
  getPriorityStormLeads: (ctx) => getPriorityStormLeads(ctx.regionId as string | undefined),
  getTeamAssignments: () => getTeamAssignments(),
  generateStormTalkingPoints: () => generateStormTalkingPoints(),
  getLogisticsChecklist: () => getLogisticsChecklist(),
  
  // Insurance Prep
  getInsurancePrepTitleData: (ctx) => getInsurancePrepTitleData(ctx.customerId as string),
  getClaimOverviewStats: (ctx) => getClaimOverviewStats(ctx.customerId as string),
  getDamageDocumentation: () => getDamageDocumentation(),
  getCarrierIntel: (ctx) => getCarrierIntel(ctx.customerId as string),
  generateNegotiationPoints: () => generateNegotiationPoints(),
  getDocumentationChecklist: () => getDocumentationChecklist(),
  
  // Market Analysis
  getMarketAnalysisTitleData: (ctx) => getMarketAnalysisTitleData(ctx.regionId as string | undefined),
  getMarketOverviewStats: () => getMarketOverviewStats(),
  getStormActivityTrend: () => getStormActivityTrend(),
  getOpportunityHeatMap: () => getOpportunityHeatMap(),
  getCompetitiveLandscape: () => getCompetitiveLandscape(),
  generateStrategicRecommendations: () => generateStrategicRecommendations(),
};

// Helper to call any data source by name
export async function fetchDataForSlide(
  dataSourceName: string, 
  context: Record<string, unknown>
): Promise<unknown> {
  const dataSource = dataSourceRegistry[dataSourceName];
  
  if (!dataSource) {
    console.warn(`Data source not found: ${dataSourceName}`);
    return null;
  }
  
  try {
    return await dataSource(context);
  } catch (error) {
    console.error(`Error fetching data for ${dataSourceName}:`, error);
    throw error;
  }
}
