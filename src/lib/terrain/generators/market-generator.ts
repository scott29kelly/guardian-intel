import { MarketIndicator, StateCode } from '../types';
import { TERRITORY_COUNTIES } from '../constants';

// Helper functions
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type MarketTemperature = 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';

function determineMarketTemperature(
  valueChange: number, 
  salesVelocity: number, 
  inventory: number
): MarketTemperature {
  const score = 
    (valueChange > 5 ? 2 : valueChange > 0 ? 1 : 0) +
    (salesVelocity > 3 ? 2 : salesVelocity > 2 ? 1 : 0) +
    (inventory < 3 ? 2 : inventory < 6 ? 1 : 0);
  
  if (score >= 5) return 'hot';
  if (score >= 4) return 'warm';
  if (score >= 2) return 'neutral';
  if (score >= 1) return 'cool';
  return 'cold';
}

export function generateMarketIndicator(county: string, state: StateCode): MarketIndicator {
  const countyData = TERRITORY_COUNTIES.find(c => c.name === county && c.state === state);
  const baseValue = countyData?.medianHomeValue || 300000;
  
  const valueChangeYoY = parseFloat(randomBetween(-2, 8).toFixed(1));
  const salesVelocity = parseFloat(randomBetween(1.5, 4.5).toFixed(1));
  const inventoryMonths = parseFloat(randomBetween(2, 8).toFixed(1));
  
  return {
    id: `market_${county}_${state}_${Date.now()}`,
    county,
    state,
    medianHomeValue: baseValue + Math.round(randomBetween(-10000, 20000)),
    valueChangeYoY,
    salesVelocity,
    inventoryMonths,
    averageDaysOnMarket: randomInt(15, 60),
    marketTemperature: determineMarketTemperature(valueChangeYoY, salesVelocity, inventoryMonths),
    asOfDate: new Date(),
  };
}

export function generateAllMarketIndicators(): MarketIndicator[] {
  return TERRITORY_COUNTIES.map(county => 
    generateMarketIndicator(county.name, county.state)
  );
}

// Generate demo market data with some notable patterns
export function generateDemoMarketIndicators(): MarketIndicator[] {
  const indicators = generateAllMarketIndicators();
  
  // Make some markets notably hot for demo
  const hotMarkets = ['Montgomery', 'Chester', 'Prince William'];
  indicators.forEach(ind => {
    if (hotMarkets.includes(ind.county)) {
      ind.valueChangeYoY = parseFloat(randomBetween(5, 9).toFixed(1));
      ind.salesVelocity = parseFloat(randomBetween(3.5, 5).toFixed(1));
      ind.inventoryMonths = parseFloat(randomBetween(1.5, 3).toFixed(1));
      ind.marketTemperature = 'hot';
      ind.averageDaysOnMarket = randomInt(12, 25);
    }
  });
  
  // Make some markets cooler
  const coolMarkets = ['Monroe', 'Camden'];
  indicators.forEach(ind => {
    if (coolMarkets.includes(ind.county)) {
      ind.valueChangeYoY = parseFloat(randomBetween(-1, 2).toFixed(1));
      ind.salesVelocity = parseFloat(randomBetween(1.5, 2.5).toFixed(1));
      ind.inventoryMonths = parseFloat(randomBetween(5, 8).toFixed(1));
      ind.marketTemperature = 'cool';
      ind.averageDaysOnMarket = randomInt(40, 70);
    }
  });
  
  return indicators;
}

// Get market summary stats
export function getMarketSummary(indicators: MarketIndicator[]) {
  const avgValueChange = indicators.reduce((sum, i) => sum + i.valueChangeYoY, 0) / indicators.length;
  const avgDaysOnMarket = indicators.reduce((sum, i) => sum + i.averageDaysOnMarket, 0) / indicators.length;
  const avgInventory = indicators.reduce((sum, i) => sum + i.inventoryMonths, 0) / indicators.length;
  
  const temperatureCounts = {
    hot: indicators.filter(i => i.marketTemperature === 'hot').length,
    warm: indicators.filter(i => i.marketTemperature === 'warm').length,
    neutral: indicators.filter(i => i.marketTemperature === 'neutral').length,
    cool: indicators.filter(i => i.marketTemperature === 'cool').length,
    cold: indicators.filter(i => i.marketTemperature === 'cold').length,
  };
  
  const hottestMarkets = indicators
    .filter(i => i.marketTemperature === 'hot' || i.marketTemperature === 'warm')
    .sort((a, b) => b.valueChangeYoY - a.valueChangeYoY)
    .slice(0, 5);
  
  return {
    avgValueChange: parseFloat(avgValueChange.toFixed(1)),
    avgDaysOnMarket: Math.round(avgDaysOnMarket),
    avgInventory: parseFloat(avgInventory.toFixed(1)),
    temperatureCounts,
    hottestMarkets,
    totalMarkets: indicators.length,
  };
}

// Market temperature display config
export const MARKET_TEMPERATURE_CONFIG: Record<MarketTemperature, { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  hot: { 
    label: 'Hot', 
    color: 'text-rose-400', 
    bgColor: 'bg-rose-500/20',
    description: 'Strong buyer demand, low inventory, quick sales',
  },
  warm: { 
    label: 'Warm', 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/20',
    description: 'Active market with good demand',
  },
  neutral: { 
    label: 'Neutral', 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20',
    description: 'Balanced market conditions',
  },
  cool: { 
    label: 'Cool', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    description: 'Slower sales, higher inventory',
  },
  cold: { 
    label: 'Cold', 
    color: 'text-zinc-400', 
    bgColor: 'bg-zinc-500/20',
    description: 'Weak demand, excess inventory',
  },
};
