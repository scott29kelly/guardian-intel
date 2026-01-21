// Customer type matching the API response
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  roofType: string | null;
  roofAge: number | null;
  propertyValue: number | null;
  insuranceCarrier: string | null;
  policyType: string | null;
  deductible: number | null;
  leadScore: number;
  urgencyScore: number;
  profitPotential: number;
  status: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  assignedRep?: { id: string; name: string; email: string } | null;
}

// Helper to get profit and urgency from customer object
export const getCustomerProfit = (customer: Customer) => customer.profitPotential || 0;
export const getCustomerUrgency = (customer: Customer) => customer.urgencyScore || 0;

export const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "closed-won", label: "Closed Won" },
  { value: "closed-lost", label: "Closed Lost" },
];

export const stageOptions = [
  { value: "all", label: "All Stages" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed", label: "Closed" },
];

export const sortOptions = [
  { value: "leadScore", label: "Lead Score" },
  { value: "urgencyScore", label: "Urgency" },
  { value: "profitPotential", label: "Est. Profit" },
  { value: "lastContact", label: "Last Contact" },
  { value: "name", label: "Name" },
];

export type ViewMode = "cards" | "table";
