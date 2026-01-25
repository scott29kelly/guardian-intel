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
// STREET VIEW HELPERS
// =============================================================================

const LOG_PREFIX = '[StreetView]';
function logStreetView(message: string, data?: Record<string, unknown>) {
  console.log(`${LOG_PREFIX} ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

/**
 * Calculate bearing (heading) from point 1 to point 2
 * Used to determine which direction the Street View camera should face
 */
function calculateBearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate distance between two points in meters (for logging/debugging)
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get optimal Street View URL with calculated heading toward the house
 * Uses Street View Metadata API to calculate the best camera angle
 *
 * CRITICAL: Uses pano_id to ensure consistent panorama selection
 *
 * @param address - Full address string (used for fallback)
 * @param apiKey - Google Maps API key
 * @param coordinates - Optional pre-known coordinates (skips geocoding if provided)
 */
async function getStreetViewUrl(
  address: string,
  apiKey: string,
  coordinates?: { lat: number; lng: number }
): Promise<string> {
  try {
    // 1. Get house coordinates (use provided or geocode)
    let houseLat: number;
    let houseLng: number;

    if (coordinates) {
      // Use provided coordinates - skip geocoding entirely
      logStreetView('Using provided coordinates (skipping geocode)', coordinates);
      houseLat = coordinates.lat;
      houseLng = coordinates.lng;
    } else {
      // Fallback: Geocode address to get house coordinates
      logStreetView('Geocoding address', { address });

      const geoResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const geoData = await geoResponse.json();

      if (geoData.status !== 'OK') {
        logStreetView('Geocode failed', { status: geoData.status, address });
        throw new Error(`Geocode failed: ${geoData.status}`);
      }

      houseLat = geoData.results[0].geometry.location.lat;
      houseLng = geoData.results[0].geometry.location.lng;
      logStreetView('House coordinates from geocode', { houseLat, houseLng });
    }

    // 2. Get Street View panorama metadata
    const metaResponse = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${houseLat},${houseLng}&key=${apiKey}`
    );
    const metaData = await metaResponse.json();

    if (metaData.status !== 'OK') {
      logStreetView('No Street View available', { status: metaData.status, houseLat, houseLng });
      throw new Error(`No Street View: ${metaData.status}`);
    }

    const panoId = metaData.pano_id;
    const panoLat = metaData.location.lat;
    const panoLng = metaData.location.lng;

    const distanceMeters = Math.round(haversineDistance(houseLat, houseLng, panoLat, panoLng));
    logStreetView('Panorama found', { panoId, panoLat, panoLng, distanceFromHouse: `${distanceMeters}m` });

    // 3. Calculate heading FROM panorama TO house
    const heading = calculateBearing(panoLat, panoLng, houseLat, houseLng);

    logStreetView('Calculated heading', {
      heading: heading.toFixed(1),
      from: { lat: panoLat, lng: panoLng },
      to: { lat: houseLat, lng: houseLng }
    });

    // 4. Build URL using pano_id (NOT location) for consistent results
    // Using pano_id ensures we get the EXACT panorama we calculated heading for
    const params = new URLSearchParams({
      size: '960x420',
      pano: panoId,
      heading: heading.toFixed(1),
      pitch: '10',
      fov: '90',
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
    logStreetView('Generated Street View URL', { url: url.replace(apiKey, 'REDACTED') });

    return url;
  } catch (error) {
    logStreetView('Error, falling back to basic URL', {
      error: error instanceof Error ? error.message : 'Unknown error',
      address
    });

    // Fallback to basic URL without heading (let Google auto-detect)
    const params = new URLSearchParams({
      size: '960x420',
      location: address,
      pitch: '10',
      fov: '90',
      key: apiKey,
    });
    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  }
}

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

    // Get Street View URL with calculated heading toward the house
    // Use customer's stored coordinates if available (avoids geocoding API call)
    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    let streetViewUrl = '/placeholder-property.svg';

    if (mapsApiKey) {
      const coordinates = customer.latitude && customer.longitude
        ? { lat: customer.latitude, lng: customer.longitude }
        : undefined;
      streetViewUrl = await getStreetViewUrl(address, mapsApiKey, coordinates);
    }

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
// DAILY BRIEFING DATA FUNCTIONS
// =============================================================================

export async function getDailyBriefingTitleData(repId?: string): Promise<TitleSlideContent> {
  void repId;
  
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  
  return {
    title: `${greeting}!`,
    subtitle: 'Your Daily Sales Briefing',
    date: today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Sales Team',
    preparedBy: 'Guardian Intel',
  };
}

export async function getDailyStats(repId?: string): Promise<StatsSlideContent> {
  void repId;
  
  try {
    const response = await fetch('/api/analytics/dashboard');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await response.json();
    
    return {
      title: 'Your Day At-A-Glance',
      stats: [
        { 
          label: 'Scheduled Calls', 
          value: data.scheduledCalls || 5, 
          icon: 'Phone' 
        },
        { 
          label: 'Pending Follow-ups', 
          value: data.pendingFollowups || 8, 
          trend: data.pendingFollowups > 10 ? 'down' : 'neutral',
          icon: 'Clock' 
        },
        { 
          label: 'Active Deals', 
          value: data.activeDeals || 12, 
          icon: 'Briefcase' 
        },
        { 
          label: 'Pipeline Value', 
          value: data.pipelineValue ? `$${data.pipelineValue.toLocaleString()}` : '$45,000',
          icon: 'DollarSign' 
        },
      ],
      footnote: `Last synced: ${new Date().toLocaleTimeString()}`
    };
  } catch {
    return {
      title: 'Your Day At-A-Glance',
      stats: [
        { label: 'Scheduled Calls', value: 5, icon: 'Phone' },
        { label: 'Pending Follow-ups', value: 8, icon: 'Clock' },
        { label: 'Active Deals', value: 12, icon: 'Briefcase' },
        { label: 'Pipeline Value', value: '$45,000', icon: 'DollarSign' },
      ],
    };
  }
}

export async function getDailyWeatherForecast(): Promise<ChartSlideContent> {
  return {
    title: 'Weather & Storm Activity',
    chartType: 'bar',
    data: [
      { day: 'Today', precip: 0, temp: 72, stormRisk: 'Low' },
      { day: 'Tue', precip: 15, temp: 74, stormRisk: 'Low' },
      { day: 'Wed', precip: 45, temp: 68, stormRisk: 'Medium' },
      { day: 'Thu', precip: 60, temp: 65, stormRisk: 'High' },
      { day: 'Fri', precip: 30, temp: 70, stormRisk: 'Medium' },
      { day: 'Sat', precip: 10, temp: 73, stormRisk: 'Low' },
      { day: 'Sun', precip: 5, temp: 75, stormRisk: 'Low' },
    ],
    xKey: 'day',
    yKey: 'precip',
    footnote: '⚡ Storm opportunity alert: Thursday - High probability storm activity expected',
  };
}

export async function getPriorityCustomersToday(repId?: string): Promise<ListSlideContent> {
  void repId;
  
  try {
    const response = await fetch('/api/customers?limit=5&sort=urgencyScore&order=desc');
    if (!response.ok) throw new Error('Failed to fetch customers');
    const data = await response.json();
    const customers = data.data || [];
    
    return {
      title: 'Priority Customers Today',
      items: customers.slice(0, 5).map((customer: {
        firstName: string;
        lastName: string;
        address: string;
        urgencyScore: number;
        stage: string;
        lastContactedAt?: string;
      }, index: number) => ({
        primary: `${index + 1}. ${customer.firstName} ${customer.lastName}`,
        secondary: `${customer.address} | Urgency: ${customer.urgencyScore} | Stage: ${customer.stage?.replace(/_/g, ' ')}`,
        icon: customer.urgencyScore > 80 ? 'Flame' : customer.urgencyScore > 50 ? 'Star' : 'User',
        highlight: customer.urgencyScore > 80,
      })),
      numbered: false,
    };
  } catch {
    return {
      title: 'Priority Customers Today',
      items: [
        { primary: 'Loading priority customers...', secondary: 'Calculating scores', icon: 'Loader' },
      ],
      numbered: false,
    };
  }
}

export async function getAtRiskDeals(repId?: string): Promise<ListSlideContent> {
  void repId;
  
  return {
    title: 'Deals At Risk',
    items: [
      {
        primary: 'Johnson Property - $18,500',
        secondary: 'No contact in 7 days | Was in negotiation',
        icon: 'AlertTriangle',
        highlight: true,
      },
      {
        primary: 'Martinez Roof Replacement - $24,000',
        secondary: 'Competitor quote received | Follow up urgently',
        icon: 'AlertTriangle',
        highlight: true,
      },
      {
        primary: 'Williams Insurance Claim - $15,200',
        secondary: 'Adjuster meeting postponed twice',
        icon: 'Clock',
        highlight: false,
      },
    ],
    numbered: false,
  };
}

export async function getScheduledCallsTimeline(repId?: string): Promise<TimelineSlideContent> {
  void repId;
  
  return {
    title: 'Today\'s Schedule',
    events: [
      {
        date: '9:00 AM',
        title: 'Smith Family - Follow-up Call',
        description: 'Confirm inspection scheduled for Friday',
        status: 'upcoming',
        icon: 'Phone',
      },
      {
        date: '10:30 AM',
        title: 'Garcia Property - On-site Inspection',
        description: '123 Oak Street | New hail damage assessment',
        status: 'upcoming',
        icon: 'Home',
      },
      {
        date: '1:00 PM',
        title: 'Davis Residence - Adjuster Meeting',
        description: 'State Farm adjuster | Bring documentation',
        status: 'upcoming',
        icon: 'Users',
      },
      {
        date: '3:30 PM',
        title: 'Thompson - Contract Signing',
        description: 'Close deal | $22,400 roof replacement',
        status: 'upcoming',
        icon: 'FileSignature',
      },
    ],
  };
}

export async function generateDailyTalkingPoints(repId?: string): Promise<TalkingPointsSlideContent> {
  void repId;
  
  return {
    title: 'AI Talking Points for Today',
    aiGenerated: true,
    points: [
      {
        topic: 'Storm Season Opener',
        script: 'We\'re entering peak storm season. This is a great time to mention our free inspection offer and how we help homeowners get ahead of potential damage.',
        priority: 'high',
      },
      {
        topic: 'Insurance Deadline Reminder',
        script: 'For customers with storm damage from last month, remind them insurance claims have a filing deadline. Acting now ensures they don\'t miss their coverage window.',
        priority: 'high',
      },
      {
        topic: 'Referral Incentive',
        script: 'We\'re running a referral bonus this month. Mention to satisfied customers that they can earn $200 for each successful referral.',
        priority: 'medium',
      },
      {
        topic: 'Financing Highlight',
        script: 'For price-sensitive customers, lead with our 0% financing for 12 months. This removes the budget objection upfront.',
        priority: 'medium',
      },
    ],
  };
}

// =============================================================================
// COMPETITOR ANALYSIS DATA FUNCTIONS
// =============================================================================

export async function getCompetitorAnalysisTitleData(regionId?: string): Promise<TitleSlideContent> {
  void regionId;
  
  return {
    title: 'Competitive Intelligence Report',
    subtitle: 'Regional Market Analysis | Roofing & Storm Repair',
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

export async function getMarketPositionStats(regionId?: string): Promise<StatsSlideContent> {
  void regionId;
  
  return {
    title: 'Market Position Overview',
    stats: [
      { label: 'Market Share', value: '18%', trend: 'up', change: '+3%', icon: 'PieChart' },
      { label: 'Win Rate vs Competitors', value: '62%', trend: 'up', icon: 'Trophy' },
      { label: 'Active Competitors', value: 12, icon: 'Users' },
      { label: 'Price Position', value: 'Mid-High', icon: 'DollarSign' },
    ],
    footnote: 'Based on last 90 days of market activity',
  };
}

export async function getCompetitorLandscapeData(): Promise<ComparisonSlideContent> {
  return {
    title: 'Key Competitors',
    columns: [
      {
        header: 'Premium Competitors',
        items: [
          'RoofMasters Pro - Focus on high-end, longer warranties',
          'StormShield Elite - Insurance claim specialists',
          'Heritage Roofing - 40+ years reputation',
        ],
      },
      {
        header: 'Budget Competitors',
        items: [
          'QuickFix Roofing - Low price, minimal service',
          'Discount Storm Repair - Volume-focused',
          'Local Handyman Networks - Fragmented, inconsistent',
        ],
      },
    ],
  };
}

export async function getWinLossAnalysisData(): Promise<ChartSlideContent> {
  return {
    title: 'Win/Loss Analysis (Last 90 Days)',
    chartType: 'bar',
    data: [
      { competitor: 'RoofMasters', wins: 15, losses: 8 },
      { competitor: 'StormShield', wins: 12, losses: 10 },
      { competitor: 'QuickFix', wins: 22, losses: 5 },
      { competitor: 'Heritage', wins: 8, losses: 12 },
      { competitor: 'Others', wins: 18, losses: 14 },
    ],
    xKey: 'competitor',
    yKey: 'wins',
    footnote: 'Green = deals won against competitor, tracked via CRM lost reason field',
  };
}

export async function getPricingIntelData(): Promise<StatsSlideContent> {
  return {
    title: 'Pricing Intelligence',
    stats: [
      { label: 'Our Avg Quote', value: '$18,500', icon: 'DollarSign' },
      { label: 'Market Average', value: '$16,200', icon: 'TrendingDown' },
      { label: 'Premium Avg', value: '$21,400', icon: 'TrendingUp' },
      { label: 'Budget Avg', value: '$12,800', icon: 'ArrowDown' },
    ],
    footnote: 'We position 14% above market avg with premium service justification',
  };
}

export async function getTopLossReasons(): Promise<ListSlideContent> {
  return {
    title: 'Top Loss Reasons',
    items: [
      {
        primary: 'Price (38%)',
        secondary: 'Customer chose lower-priced competitor',
        icon: 'DollarSign',
        highlight: true,
      },
      {
        primary: 'Timing (24%)',
        secondary: 'Customer delayed decision or chose existing contractor',
        icon: 'Clock',
        highlight: false,
      },
      {
        primary: 'Competitor Relationship (18%)',
        secondary: 'Previous relationship with another contractor',
        icon: 'Users',
        highlight: false,
      },
      {
        primary: 'Insurance Issues (12%)',
        secondary: 'Claim denied or coverage insufficient',
        icon: 'Shield',
        highlight: false,
      },
      {
        primary: 'Other (8%)',
        secondary: 'Various reasons including DIY, move, etc.',
        icon: 'HelpCircle',
        highlight: false,
      },
    ],
    numbered: false,
  };
}

export async function generateDifferentiationStrategy(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Competitive Differentiation',
    aiGenerated: true,
    points: [
      {
        topic: 'Against Premium Competitors',
        script: 'We offer the same quality workmanship and materials at 10-15% lower cost. Our insurance expertise means faster claim approvals and maximum coverage for the customer.',
        priority: 'high',
      },
      {
        topic: 'Against Budget Competitors',
        script: 'Emphasize our comprehensive warranty, licensed crews, and insurance claim support. Budget contractors often leave customers with denied claims and warranty issues.',
        priority: 'high',
      },
      {
        topic: 'Insurance Expertise Edge',
        script: 'Our 85% supplement success rate means customers typically get $3,000-5,000 more in claim value. This often covers their entire deductible.',
        priority: 'high',
      },
      {
        topic: 'Response Time Advantage',
        script: 'We respond within 2 hours vs industry average of 24-48 hours. First responder in storm situations wins 70% of deals.',
        priority: 'medium',
      },
    ],
  };
}

export async function getCompetitiveActionItems(): Promise<ListSlideContent> {
  return {
    title: 'Recommended Competitive Actions',
    items: [
      {
        primary: 'Launch price-match guarantee for qualified leads',
        secondary: 'Match competitor quotes with equivalent scope to reduce price objections',
        icon: 'Target',
        highlight: true,
      },
      {
        primary: 'Accelerate response time SLA',
        secondary: 'Target 1-hour response for storm leads to beat competitors to opportunities',
        icon: 'Zap',
        highlight: false,
      },
      {
        primary: 'Develop Heritage competitor battle card',
        secondary: 'We\'re losing market share to Heritage - need specific counter-positioning',
        icon: 'FileText',
        highlight: true,
      },
      {
        primary: 'Increase referral incentive temporarily',
        secondary: 'Boost from $200 to $350 to grow through word-of-mouth vs paid marketing',
        icon: 'Users',
        highlight: false,
      },
    ],
    numbered: true,
  };
}

// =============================================================================
// CUSTOMER PROPOSAL DATA FUNCTIONS
// =============================================================================

export async function getProposalTitleData(customerId: string): Promise<TitleSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    return {
      title: 'Roofing Proposal',
      subtitle: `Prepared for ${customer.firstName} ${customer.lastName}`,
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preparedFor: `${customer.firstName} ${customer.lastName}`,
      preparedBy: 'Guardian Storm Repair',
      logoUrl: '/guardian-logo.svg',
    };
  } catch {
    return {
      title: 'Roofing Proposal',
      subtitle: 'Professional Storm Repair Services',
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preparedBy: 'Guardian Storm Repair',
    };
  }
}

export async function getCompanyCredentialsStats(): Promise<StatsSlideContent> {
  return {
    title: 'Why Choose Guardian Storm Repair',
    stats: [
      { label: 'Years in Business', value: '15+', icon: 'Award' },
      { label: 'Projects Completed', value: '5,000+', icon: 'Home' },
      { label: 'Customer Satisfaction', value: '4.9/5', icon: 'Star' },
      { label: 'Licensed & Insured', value: '✓', icon: 'Shield' },
    ],
    footnote: 'GAF Master Elite Certified | BBB A+ Rated',
  };
}

export async function getPropertyAssessmentData(customerId: string): Promise<ImageSlideContent> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer');
    const data = await response.json();
    const customer = data.customer;
    
    const address = `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`;
    
    return {
      title: 'Property Assessment',
      imageUrl: `/api/property/street-view?address=${encodeURIComponent(address)}`,
      altText: `Property at ${address}`,
      caption: `${customer.address}, ${customer.city}, ${customer.state}`,
      notes: [
        'Comprehensive roof inspection completed',
        'All damage documented with photos',
        'Measurements verified for accurate scope',
      ],
    };
  } catch {
    return {
      title: 'Property Assessment',
      imageUrl: '/placeholder-property.svg',
      altText: 'Property assessment',
      caption: 'Your property',
      notes: ['Professional inspection completed', 'All findings documented'],
    };
  }
}

export async function getScopeOfWorkData(): Promise<ListSlideContent> {
  return {
    title: 'Scope of Work',
    items: [
      {
        primary: 'Complete Roof Removal',
        secondary: 'Remove existing shingles, underlayment, and damaged decking',
        icon: 'Trash2',
      },
      {
        primary: 'Decking Inspection & Repair',
        secondary: 'Replace any damaged or rotted decking boards',
        icon: 'Grid',
      },
      {
        primary: 'Ice & Water Shield Installation',
        secondary: 'Full coverage in valleys and eaves per code requirements',
        icon: 'Shield',
      },
      {
        primary: 'Premium Synthetic Underlayment',
        secondary: 'Breathable, waterproof barrier for enhanced protection',
        icon: 'Layers',
      },
      {
        primary: 'Architectural Shingles',
        secondary: 'GAF Timberline HDZ - Lifetime warranty shingles',
        icon: 'Home',
        highlight: true,
      },
      {
        primary: 'Ridge Vent System',
        secondary: 'Proper attic ventilation for energy efficiency',
        icon: 'Wind',
      },
      {
        primary: 'Flashing & Trim',
        secondary: 'All penetrations and edges properly sealed',
        icon: 'Square',
      },
      {
        primary: 'Complete Cleanup',
        secondary: 'Magnetic nail sweep and debris removal',
        icon: 'Sparkles',
      },
    ],
    numbered: true,
  };
}

export async function getPricingOptionsData(): Promise<ComparisonSlideContent> {
  return {
    title: 'Investment Options',
    columns: [
      {
        header: 'Good - Standard',
        items: [
          '3-Tab Shingles',
          '25-Year Warranty',
          'Basic Underlayment',
          'Standard Ventilation',
          '$12,500',
        ],
      },
      {
        header: 'Better - Enhanced ⭐',
        items: [
          'Architectural Shingles',
          '50-Year Warranty',
          'Synthetic Underlayment',
          'Ridge Vent System',
          '$15,800',
        ],
      },
      {
        header: 'Best - Premium',
        items: [
          'Designer Shingles',
          'Lifetime Warranty',
          'Premium Ice & Water Shield',
          'Solar Attic Fan',
          '$19,200',
        ],
      },
    ],
  };
}

export async function getFinancingOptionsData(): Promise<StatsSlideContent> {
  return {
    title: 'Flexible Financing Options',
    stats: [
      { label: '0% APR', value: '12 months', icon: 'CreditCard' },
      { label: 'Low Monthly', value: 'from $149/mo', icon: 'DollarSign' },
      { label: 'Quick Approval', value: '< 5 minutes', icon: 'Zap' },
      { label: 'No Prepayment Penalty', value: '✓', icon: 'CheckCircle' },
    ],
    footnote: 'Financing subject to credit approval. Multiple lender options available.',
  };
}

export async function getTestimonialsData(): Promise<ListSlideContent> {
  return {
    title: 'What Our Customers Say',
    items: [
      {
        primary: '"Exceptional service from start to finish!"',
        secondary: '⭐⭐⭐⭐⭐ - Sarah M., Homeowner | Full roof replacement after hail damage',
        icon: 'Quote',
      },
      {
        primary: '"They handled my insurance claim perfectly"',
        secondary: '⭐⭐⭐⭐⭐ - Robert T., Homeowner | Got full coverage approval in 2 weeks',
        icon: 'Quote',
      },
      {
        primary: '"Professional crew, beautiful results"',
        secondary: '⭐⭐⭐⭐⭐ - Jennifer K., Homeowner | Neighbors are now using them too',
        icon: 'Quote',
      },
    ],
    numbered: false,
  };
}

export async function getWarrantyData(): Promise<ListSlideContent> {
  return {
    title: 'Our Guarantee',
    items: [
      {
        primary: 'Lifetime Workmanship Warranty',
        secondary: 'We stand behind our work for as long as you own your home',
        icon: 'Shield',
        highlight: true,
      },
      {
        primary: 'Manufacturer\'s Material Warranty',
        secondary: 'Full coverage on all materials per manufacturer terms',
        icon: 'Package',
      },
      {
        primary: '5-Year No-Leak Guarantee',
        secondary: 'If your roof leaks, we fix it free - no questions asked',
        icon: 'Droplet',
        highlight: true,
      },
      {
        primary: '100% Satisfaction Promise',
        secondary: 'We\'re not done until you\'re completely satisfied',
        icon: 'ThumbsUp',
      },
    ],
    numbered: false,
  };
}

export async function getProposalNextSteps(): Promise<TimelineSlideContent> {
  return {
    title: 'Getting Started',
    events: [
      {
        date: 'Step 1',
        title: 'Accept Proposal',
        description: 'Review and sign the agreement to lock in pricing',
        status: 'upcoming',
        icon: 'FileSignature',
      },
      {
        date: 'Step 2',
        title: 'Insurance Coordination',
        description: 'We handle all paperwork and adjuster meetings',
        status: 'upcoming',
        icon: 'Shield',
      },
      {
        date: 'Step 3',
        title: 'Material Selection',
        description: 'Choose your preferred colors and upgrade options',
        status: 'upcoming',
        icon: 'Palette',
      },
      {
        date: 'Step 4',
        title: 'Installation',
        description: 'Professional installation, typically 1-2 days',
        status: 'upcoming',
        icon: 'Hammer',
      },
      {
        date: 'Step 5',
        title: 'Final Walkthrough',
        description: 'Inspect completed work and receive warranty documents',
        status: 'upcoming',
        icon: 'CheckCircle',
      },
    ],
  };
}

// =============================================================================
// WEEKLY PIPELINE DATA FUNCTIONS
// =============================================================================

export async function getWeeklyPipelineTitleData(teamId?: string): Promise<TitleSlideContent> {
  void teamId;
  
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  return {
    title: 'Weekly Pipeline Review',
    subtitle: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Sales Management',
    preparedBy: 'Guardian Intel',
  };
}

export async function getPipelineSummaryStats(teamId?: string): Promise<StatsSlideContent> {
  void teamId;
  
  try {
    const response = await fetch('/api/analytics/dashboard');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await response.json();
    
    return {
      title: 'Pipeline Summary',
      stats: [
        { 
          label: 'Total Pipeline Value', 
          value: data.pipelineValue ? `$${data.pipelineValue.toLocaleString()}` : '$892,000',
          trend: 'up',
          change: '+$45K',
          icon: 'DollarSign' 
        },
        { 
          label: 'Active Deals', 
          value: data.activeDeals || 47, 
          icon: 'Briefcase' 
        },
        { 
          label: 'Weighted Forecast', 
          value: data.weightedForecast ? `$${data.weightedForecast.toLocaleString()}` : '$312,000',
          icon: 'Target' 
        },
        { 
          label: 'Avg Win Probability', 
          value: data.avgWinProbability ? `${data.avgWinProbability}%` : '42%',
          trend: 'neutral',
          icon: 'TrendingUp' 
        },
      ],
    };
  } catch {
    return {
      title: 'Pipeline Summary',
      stats: [
        { label: 'Total Pipeline Value', value: '$892,000', icon: 'DollarSign' },
        { label: 'Active Deals', value: 47, icon: 'Briefcase' },
        { label: 'Weighted Forecast', value: '$312,000', icon: 'Target' },
        { label: 'Avg Win Probability', value: '42%', icon: 'TrendingUp' },
      ],
    };
  }
}

export async function getDealsByStageChart(): Promise<ChartSlideContent> {
  return {
    title: 'Deals by Stage',
    chartType: 'bar',
    data: [
      { stage: 'New Lead', count: 24, value: 240000 },
      { stage: 'Contacted', count: 18, value: 198000 },
      { stage: 'Qualified', count: 12, value: 168000 },
      { stage: 'Proposal', count: 8, value: 152000 },
      { stage: 'Negotiation', count: 5, value: 95000 },
      { stage: 'Verbal Yes', count: 3, value: 39000 },
    ],
    xKey: 'stage',
    yKey: 'count',
    footnote: 'Values shown represent total estimated deal value per stage',
  };
}

export async function getStageMovementStats(): Promise<StatsSlideContent> {
  return {
    title: 'Week-over-Week Movement',
    stats: [
      { 
        label: 'Deals Advanced', 
        value: 12, 
        trend: 'up',
        change: '+4 vs last week',
        icon: 'ArrowUpRight' 
      },
      { 
        label: 'Deals Stalled', 
        value: 5, 
        trend: 'down',
        icon: 'Pause' 
      },
      { 
        label: 'Deals Won', 
        value: 4, 
        trend: 'up',
        change: '$68,400',
        icon: 'Trophy' 
      },
      { 
        label: 'Deals Lost', 
        value: 2, 
        trend: 'neutral',
        icon: 'XCircle' 
      },
    ],
    footnote: 'Stalled = no activity for 5+ business days',
  };
}

export async function getAtRiskOpportunities(): Promise<ListSlideContent> {
  return {
    title: 'At-Risk Opportunities',
    items: [
      {
        primary: 'Williams Property - $24,500 | Negotiation',
        secondary: 'Last contact 12 days ago | Competitor quote received',
        icon: 'AlertTriangle',
        highlight: true,
      },
      {
        primary: 'Chen Residence - $18,200 | Proposal',
        secondary: 'Customer unresponsive to 3 follow-up attempts',
        icon: 'AlertTriangle',
        highlight: true,
      },
      {
        primary: 'Garcia Insurance Claim - $21,000 | Qualified',
        secondary: 'Adjuster meeting delayed twice | Risk of claim expiry',
        icon: 'Clock',
        highlight: false,
      },
      {
        primary: 'Thompson Roof - $15,800 | Contacted',
        secondary: 'Price objection raised | May need manager involvement',
        icon: 'DollarSign',
        highlight: false,
      },
    ],
    numbered: false,
  };
}

export async function getHotDealsToClose(): Promise<ListSlideContent> {
  return {
    title: 'Hot Deals - Ready to Close',
    items: [
      {
        primary: 'Martinez Residence - $22,400 | Verbal Yes',
        secondary: 'Contract ready | Signing scheduled Thursday',
        icon: 'Flame',
        highlight: true,
      },
      {
        primary: 'Johnson Property - $19,800 | Negotiation',
        secondary: 'Final objection resolved | Close expected this week',
        icon: 'Flame',
        highlight: true,
      },
      {
        primary: 'Brown Family Home - $17,500 | Proposal',
        secondary: 'High engagement | Multiple positive touchpoints',
        icon: 'Star',
        highlight: false,
      },
      {
        primary: 'Davis Storm Damage - $26,200 | Qualified',
        secondary: 'Insurance approved | Just needs scheduling',
        icon: 'CheckCircle',
        highlight: true,
      },
    ],
    numbered: false,
  };
}

export async function getRevenueForecastChart(): Promise<ChartSlideContent> {
  return {
    title: 'Revenue Forecast',
    chartType: 'area',
    data: [
      { week: 'This Week', committed: 42400, likely: 25000, possible: 15000 },
      { week: 'Week 2', committed: 18000, likely: 35000, possible: 28000 },
      { week: 'Week 3', committed: 8000, likely: 22000, possible: 45000 },
      { week: 'Week 4', committed: 0, likely: 15000, possible: 38000 },
    ],
    xKey: 'week',
    yKey: 'committed',
    footnote: 'Committed = verbal yes or scheduled | Likely = high probability | Possible = in pipeline',
  };
}

export async function generatePipelineCoachingPoints(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Coaching Recommendations',
    aiGenerated: true,
    points: [
      {
        topic: 'Rep: Mike S. - Speed to Lead',
        script: 'Average response time is 4.2 hours. Top performers respond in under 1 hour. Review lead notification settings and morning routines.',
        priority: 'high',
      },
      {
        topic: 'Rep: Sarah T. - Proposal Follow-up',
        script: '6 proposals sent, only 2 follow-up calls. Implement 48-hour follow-up rule for all proposals.',
        priority: 'high',
      },
      {
        topic: 'Team-wide: Stalled Deals',
        script: '8 deals have been stalled 7+ days. Schedule deal review session to create action plans for each.',
        priority: 'medium',
      },
      {
        topic: 'Opportunity: Insurance Claims',
        script: 'Claims with adjuster meetings scheduled close at 78% vs 34% for those without. Push for more adjuster involvement.',
        priority: 'medium',
      },
    ],
  };
}

// =============================================================================
// STORM POST-MORTEM DATA FUNCTIONS
// =============================================================================

export async function getStormPostmortemTitleData(regionId?: string): Promise<TitleSlideContent> {
  void regionId;
  
  return {
    title: 'Storm Response Post-Mortem',
    subtitle: 'After-Action Report | January 2026 Storm Event',
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    preparedFor: 'Leadership & Operations',
    preparedBy: 'Guardian Intel Analytics',
  };
}

export async function getStormResponseSummaryStats(regionId?: string): Promise<StatsSlideContent> {
  void regionId;
  
  return {
    title: 'Response Summary',
    stats: [
      { label: 'Leads Generated', value: 342, trend: 'up', icon: 'Users' },
      { label: 'Inspections Completed', value: 186, icon: 'ClipboardCheck' },
      { label: 'Deals Closed', value: 47, trend: 'up', icon: 'Trophy' },
      { label: 'Revenue Generated', value: '$824,500', icon: 'DollarSign' },
    ],
    footnote: 'Storm response period: Jan 5-18, 2026',
  };
}

export async function getStormPerformanceChart(): Promise<ChartSlideContent> {
  return {
    title: 'Daily Performance During Storm Response',
    chartType: 'line',
    data: [
      { day: 'Day 1', leads: 45, inspections: 12, deals: 0 },
      { day: 'Day 2', leads: 62, inspections: 28, deals: 2 },
      { day: 'Day 3', leads: 58, inspections: 35, deals: 5 },
      { day: 'Day 4', leads: 41, inspections: 32, deals: 8 },
      { day: 'Day 5', leads: 35, inspections: 29, deals: 7 },
      { day: 'Day 6', leads: 28, inspections: 24, deals: 9 },
      { day: 'Day 7', leads: 22, inspections: 18, deals: 8 },
      { day: 'Day 8', leads: 18, inspections: 15, deals: 4 },
      { day: 'Day 9', leads: 15, inspections: 12, deals: 4 },
    ],
    xKey: 'day',
    yKey: 'leads',
    footnote: 'Peak activity on Day 2-3 with gradual decline as storm impact lessened',
  };
}

export async function getStormConversionFunnel(): Promise<ChartSlideContent> {
  return {
    title: 'Conversion Funnel',
    chartType: 'bar',
    data: [
      { stage: 'Leads', count: 342, rate: '100%' },
      { stage: 'Contacted', count: 298, rate: '87%' },
      { stage: 'Inspections', count: 186, rate: '54%' },
      { stage: 'Proposals', count: 124, rate: '36%' },
      { stage: 'Closed', count: 47, rate: '14%' },
    ],
    xKey: 'stage',
    yKey: 'count',
    footnote: 'Overall lead-to-close conversion: 13.7% (above 10% target)',
  };
}

export async function getStormRepPerformance(): Promise<ListSlideContent> {
  return {
    title: 'Rep Performance Breakdown',
    items: [
      {
        primary: '1. Mike S. - $186,400 | 11 deals',
        secondary: 'Highest revenue | 18% conversion rate',
        icon: 'Trophy',
        highlight: true,
      },
      {
        primary: '2. Sarah T. - $152,200 | 9 deals',
        secondary: 'Fastest response time (avg 42 min)',
        icon: 'Medal',
        highlight: false,
      },
      {
        primary: '3. James R. - $148,600 | 8 deals',
        secondary: 'Highest avg deal size ($18,575)',
        icon: 'Medal',
        highlight: false,
      },
      {
        primary: '4. Lisa M. - $124,800 | 7 deals',
        secondary: 'Best inspection-to-close ratio (58%)',
        icon: 'User',
        highlight: false,
      },
      {
        primary: '5. Tom K. - $98,400 | 6 deals',
        secondary: 'Newest team member - strong performance',
        icon: 'User',
        highlight: false,
      },
    ],
    numbered: false,
  };
}

export async function getHistoricalStormComparison(): Promise<ComparisonSlideContent> {
  return {
    title: 'Historical Storm Comparison',
    columns: [
      {
        header: 'This Storm (Jan 2026)',
        items: [
          '342 leads generated',
          '47 deals closed',
          '$824,500 revenue',
          '13.7% conversion',
          'Avg response: 1.8 hrs',
        ],
      },
      {
        header: 'Previous Storm (Sep 2025)',
        items: [
          '289 leads generated (+18%)',
          '38 deals closed (+24%)',
          '$665,000 revenue (+24%)',
          '13.1% conversion (+0.6%)',
          'Avg response: 2.4 hrs (-25%)',
        ],
      },
    ],
  };
}

export async function getStormLessonsLearned(): Promise<ListSlideContent> {
  return {
    title: 'Lessons Learned',
    items: [
      {
        primary: '✓ Rapid response paid off',
        secondary: 'Deals closed within 48 hours of first contact had 3x higher close rate',
        icon: 'CheckCircle',
        highlight: true,
      },
      {
        primary: '✓ Pre-positioned materials helped',
        secondary: 'Having leave-behinds ready reduced canvassing setup time by 2 hours',
        icon: 'CheckCircle',
        highlight: false,
      },
      {
        primary: '⚠ Lead distribution was uneven',
        secondary: 'Some reps were overwhelmed while others had capacity. Need better load balancing.',
        icon: 'AlertTriangle',
        highlight: true,
      },
      {
        primary: '⚠ Insurance prep gaps',
        secondary: '12 claims denied due to documentation issues. Need better training.',
        icon: 'AlertTriangle',
        highlight: false,
      },
      {
        primary: '✗ Missed evening hours opportunity',
        secondary: 'Competitors who canvassed 6-8 PM captured leads we missed',
        icon: 'XCircle',
        highlight: true,
      },
    ],
    numbered: false,
  };
}

export async function generateStormPostmortemRecommendations(): Promise<TalkingPointsSlideContent> {
  return {
    title: 'Strategic Recommendations',
    aiGenerated: true,
    points: [
      {
        topic: 'Lead Distribution System',
        script: 'Implement automated round-robin lead assignment based on rep capacity and location. This would have improved conversion by an estimated 8-12%.',
        priority: 'high',
      },
      {
        topic: 'Extended Hours Protocol',
        script: 'Create optional evening shift (5-8 PM) for storm events. Data shows 23% of leads prefer evening contact. Offer overtime incentive.',
        priority: 'high',
      },
      {
        topic: 'Insurance Documentation Training',
        script: 'Mandatory 2-hour training on claim documentation. The 12 denied claims represent $156,000 in lost revenue.',
        priority: 'medium',
      },
      {
        topic: 'Storm Readiness Kit',
        script: 'Pre-pack individual "storm kits" with 3 days of materials per rep. Reduces mobilization time from 4 hours to 30 minutes.',
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
  
  // Daily Briefing
  getDailyBriefingTitleData: (ctx) => getDailyBriefingTitleData(ctx.repId as string | undefined),
  getDailyStats: (ctx) => getDailyStats(ctx.repId as string | undefined),
  getDailyWeatherForecast: () => getDailyWeatherForecast(),
  getPriorityCustomersToday: (ctx) => getPriorityCustomersToday(ctx.repId as string | undefined),
  getAtRiskDeals: (ctx) => getAtRiskDeals(ctx.repId as string | undefined),
  getScheduledCallsTimeline: (ctx) => getScheduledCallsTimeline(ctx.repId as string | undefined),
  generateDailyTalkingPoints: (ctx) => generateDailyTalkingPoints(ctx.repId as string | undefined),
  
  // Competitor Analysis
  getCompetitorAnalysisTitleData: (ctx) => getCompetitorAnalysisTitleData(ctx.regionId as string | undefined),
  getMarketPositionStats: (ctx) => getMarketPositionStats(ctx.regionId as string | undefined),
  getCompetitorLandscapeData: () => getCompetitorLandscapeData(),
  getWinLossAnalysisData: () => getWinLossAnalysisData(),
  getPricingIntelData: () => getPricingIntelData(),
  getTopLossReasons: () => getTopLossReasons(),
  generateDifferentiationStrategy: () => generateDifferentiationStrategy(),
  getCompetitiveActionItems: () => getCompetitiveActionItems(),
  
  // Customer Proposal
  getProposalTitleData: (ctx) => getProposalTitleData(ctx.customerId as string),
  getCompanyCredentialsStats: () => getCompanyCredentialsStats(),
  getPropertyAssessmentData: (ctx) => getPropertyAssessmentData(ctx.customerId as string),
  getScopeOfWorkData: () => getScopeOfWorkData(),
  getPricingOptionsData: () => getPricingOptionsData(),
  getFinancingOptionsData: () => getFinancingOptionsData(),
  getTestimonialsData: () => getTestimonialsData(),
  getWarrantyData: () => getWarrantyData(),
  getProposalNextSteps: () => getProposalNextSteps(),
  
  // Weekly Pipeline
  getWeeklyPipelineTitleData: (ctx) => getWeeklyPipelineTitleData(ctx.teamId as string | undefined),
  getPipelineSummaryStats: (ctx) => getPipelineSummaryStats(ctx.teamId as string | undefined),
  getDealsByStageChart: () => getDealsByStageChart(),
  getStageMovementStats: () => getStageMovementStats(),
  getAtRiskOpportunities: () => getAtRiskOpportunities(),
  getHotDealsToClose: () => getHotDealsToClose(),
  getRevenueForecastChart: () => getRevenueForecastChart(),
  generatePipelineCoachingPoints: () => generatePipelineCoachingPoints(),
  
  // Storm Post-Mortem
  getStormPostmortemTitleData: (ctx) => getStormPostmortemTitleData(ctx.regionId as string | undefined),
  getStormResponseSummaryStats: (ctx) => getStormResponseSummaryStats(ctx.regionId as string | undefined),
  getStormPerformanceChart: () => getStormPerformanceChart(),
  getStormConversionFunnel: () => getStormConversionFunnel(),
  getStormRepPerformance: () => getStormRepPerformance(),
  getHistoricalStormComparison: () => getHistoricalStormComparison(),
  getStormLessonsLearned: () => getStormLessonsLearned(),
  generateStormPostmortemRecommendations: () => generateStormPostmortemRecommendations(),
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
