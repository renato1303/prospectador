export type WebsiteStatus = 'no_website' | 'social_only' | 'has_website';

export interface Interaction {
  id: string;
  timestamp: string;
  type: 'column_change' | 'whatsapp' | 'note' | 'created' | 'tag_change' | 'followup_change' | 'deal_change';
  description: string;
}

export interface Lead {
  id: string;
  placeId?: string;
  name: string;
  segment: string;
  city: string;
  address: string;
  phone: string;
  internationalPhoneNumber?: string;
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  websiteUri: string;
  status: WebsiteStatus;
  columnId: string;
  tags: string[];
  notes: string;
  dealValue: number;
  nextFollowUp?: string; // ISO date string
  lossReason?: string;
  createdAt: string;
  updatedAt: string;
  history: Interaction[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface SearchQuery {
  id: string;
  segment: string;
  city: string;
  neighborhoods: string[];
  timestamp: string;
  totalFound: number;
  totalNoWebsite: number;
}

export interface AppSettings {
  googlePlacesApiKey: string;
  geminiApiKey: string;
  whatsappTemplate: string; // for no website
  whatsappTemplateSocial: string; // for social only
  whatsappTemplateSite: string; // for has website
  theme: 'light' | 'dark';
}
