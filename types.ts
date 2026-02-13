
export interface Role {
  id: string;
  title: string;
  skills: string[];
  description?: string;
  status: 'Exploring' | 'Open' | 'Applied' | 'Interviewing' | 'Closed';
}

export interface Team {
  name: string;
  focus: string;
}

export type CompanyStage = 'Startup' | 'Scaleup' | 'Corporate' | string;
export type BusinessModel = 'SaaS' | 'B2B' | 'B2C' | 'Marketplace' | 'Fintech' | 'HealthTech' | 'AI/ML' | string;

export interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
  website: string;
  careerWebsite?: string;
  roles: Role[];
  teams?: Team[];
  logo?: string;
  stage?: CompanyStage;
  valuation?: number; // In millions
  leadInvestor?: string;
  businessModel?: BusinessModel;
}

export interface Contact {
  id: string;
  name: string;
  companyId?: string;
  location: string;
  tags: string[];
  howMet: string;
  commonalities: string;
  lastConversationYear?: number;
  lastConversationMonth?: number;
  lastConversationDay?: number;
  lastConversation: string;
  notes: string;
  email?: string;
  linkedin?: string;
}

export type ViewType = 'companies' | 'network';
