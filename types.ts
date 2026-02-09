
export interface Role {
  id: string;
  title: string;
  skills: string[];
  description?: string;
  status: 'Exploring' | 'Open' | 'Applied' | 'Interviewing' | 'Closed';
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
  website: string;
  roles: Role[];
  logo?: string;
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
  lastConversation: string; // Kept for legacy display/sorting if needed, but we'll prioritize components
  notes: string;
  email?: string;
  linkedin?: string;
}

export type ViewType = 'companies' | 'network';
