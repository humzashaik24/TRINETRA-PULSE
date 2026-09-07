import type { EntityType } from './entity';

// ============================================================
// DASHBOARD METRICS
// ============================================================

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
  icon: string;
  description?: string;
}

export interface DashboardMetrics {
  entities: DashboardMetric;
  relationships: DashboardMetric;
  events: DashboardMetric;
  activeInvestigations: DashboardMetric;
  suspiciousPatterns: DashboardMetric;
  evidenceItems: DashboardMetric;
}

// ============================================================
// NETWORK SUMMARY (Dashboard preview)
// ============================================================

export interface DashboardNetworkNode {
  id: string;
  label: string;
  type: EntityType;
  x: number;
  y: number;
  size: number;
  connections: number;
  highlighted?: boolean;
  selected?: boolean;
}

export interface DashboardNetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface DashboardNetworkCluster {
  id: string;
  label: string;
  nodeIds: string[];
  color: string;
}

export interface DashboardNetworkSummary {
  nodes: DashboardNetworkNode[];
  edges: DashboardNetworkEdge[];
  clusters: DashboardNetworkCluster[];
  density: number;
  communityCount: number;
  connectedComponents: number;
  averageDegree: number;
  highCentralityCount: number;
}

// ============================================================
// RECENT INTELLIGENCE
// ============================================================

export type IntelligenceSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type IntelligenceType = 'relationship' | 'pattern' | 'entity' | 'network' | 'anomaly' | 'evidence';

export interface RecentIntelligence {
  id: string;
  type: IntelligenceType;
  title: string;
  description: string;
  entities: Array<{
    id: string;
    name: string;
    type: EntityType;
  }>;
  confidence: number;
  severity: IntelligenceSeverity;
  source?: string;
  timestamp: string;
  timeAgo: string;
}

// ============================================================
// IMPORTANT ENTITIES
// ============================================================

export type ImportanceCategory = 'high_connectivity' | 'bridge_position' | 'recent_activity' | 'pattern_involvement';

export interface ImportantEntity {
  id: string;
  name: string;
  type: EntityType;
  connections: number;
  centrality: number;
  centralityLabel: string;
  category: ImportanceCategory;
  categoryLabel: string;
  activityStatus: 'active' | 'recent' | 'stale' | 'inactive';
  activityLabel: string;
  riskScore?: number;
  isFlagged?: boolean;
}

// ============================================================
// SUSPICIOUS PATTERNS
// ============================================================

export type PatternType = 'communication_spike' | 'transaction_anomaly' | 'location_pattern' | 'temporal_cluster' | 'network_burst' | 'velocity_anomaly';

export interface SuspiciousPattern {
  id: string;
  type: PatternType;
  typeLabel: string;
  title: string;
  description: string;
  entities: Array<{
    id: string;
    name: string;
    type: EntityType;
  }>;
  entityCount: number;
  confidence: number;
  severity: IntelligenceSeverity;
  metrics: Record<string, string>;
  timestamp: string;
  timeAgo: string;
  status: 'new' | 'reviewing' | 'dismissed' | 'confirmed';
}

// ============================================================
// INVESTIGATION ACTIVITY
// ============================================================

export type ActivityAction = 'created' | 'updated' | 'evidence_added' | 'entity_reviewed' | 'network_expanded' | 'pattern_detected' | 'closed' | 'assigned';

export interface InvestigationActivity {
  id: string;
  action: ActivityAction;
  actionLabel: string;
  title: string;
  subtitle: string;
  reference: {
    type: 'case' | 'entity' | 'evidence' | 'network' | 'pattern';
    id: string;
    label: string;
  };
  timestamp: string;
  timeAgo: string;
  user?: string;
}

// ============================================================
// ACTIVITY SERIES (for charts)
// ============================================================

export interface ActivityDataPoint {
  label: string;
  events: number;
  relationships: number;
  communications: number;
  patterns: number;
}

export interface ActivitySeries {
  data: ActivityDataPoint[];
  totalEvents: number;
  totalRelationships: number;
  period: string;
}

// ============================================================
// DASHBOARD STATE
// ============================================================

export type DashboardSection = 'metrics' | 'network' | 'intelligence' | 'entities' | 'patterns' | 'activity';

export interface DashboardSectionState {
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
}
