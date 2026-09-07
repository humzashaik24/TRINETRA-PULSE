export type CaseStatus = 'open' | 'active' | 'pending' | 'closed' | 'archived';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Case {
  id: string;
  title: string;
  description: string | null;
  case_number: string;
  status: CaseStatus;
  priority: CasePriority;
  lead_investigator: string | null;
  assigned_team: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  title: string;
  description?: string;
  case_number: string;
  priority?: CasePriority;
  lead_investigator?: string;
  assigned_team?: string[];
  tags?: string[];
}

export interface Incident {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  incident_number: string;
  occurred_at: string | null;
  reported_at: string | null;
  location_description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  evidence_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
