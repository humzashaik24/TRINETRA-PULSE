'use client';

import { type EntityIntelligence } from '@trinetra-pulse/types';
import { Badge } from '@trinetra-pulse/ui';
import { Fingerprint } from 'lucide-react';
import { ConfidenceIndicator } from '@trinetra-pulse/ui';
import { formatDate, formatPercent } from '@/lib/format';
import { ResolutionStateBadge } from './badges';

const SKIP_KEYS = new Set(['image', 'photo', 'avatar']);

const ATTRIBUTE_LABELS: Record<string, string> = {
  full_name: 'Full name',
  canonical_name: 'Canonical name',
  phone: 'Phone',
  phone_number: 'Phone number',
  alternate_phone: 'Alternate phone',
  email: 'Email',
  date_of_birth: 'Date of birth',
  address: 'Address',
  location: 'Location',
  id_number: 'ID number',
  vehicle_number: 'Vehicle number',
  make: 'Make',
  model: 'Model',
  color: 'Color',
  owner: 'Owner',
  carrier: 'Carrier',
  imei: 'IMEI',
  holder: 'Holder',
  city: 'City',
  state: 'State',
  country: 'Country',
  locality: 'Locality',
  legal_name: 'Legal name',
  organization: 'Organization',
  gstin: 'GSTIN',
  account_number: 'Account number',
  bank: 'Bank',
  ifsc: 'IFSC',
  transaction_id: 'Transaction ID',
  amount: 'Amount',
  date: 'Date',
  from_account: 'From account',
  to_account: 'To account',
  event_type: 'Event type',
  participants: 'Participants',
  case_number: 'Case number',
  police_station: 'Police station',
  registered: 'Registered',
  sections: 'Sections',
  document_type: 'Document type',
  filename: 'Filename',
  case: 'Case',
  evidence_type: 'Evidence type',
  reference: 'Reference',
};

function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ============================================================
// ENTITY OVERVIEW — identity, resolution status and attributes
// ============================================================

export function EntityOverview({ entity }: { entity: EntityIntelligence }) {
  const attributes = Object.entries(entity.attributes ?? {}).filter(
    ([k]) => !SKIP_KEYS.has(k) && !k.startsWith('_')
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ResolutionStateBadge state={entity.resolutionState} />
          {entity.isVerified && <Badge variant="success" size="sm">Verified</Badge>}
          {entity.isFlagged && <Badge variant="danger" size="sm">Flagged</Badge>}
          {entity.canonicalName && (
            <Badge variant="outline" size="sm" className="font-mono">
              {entity.canonicalName}
            </Badge>
          )}
        </div>

        {entity.description && (
          <p className="text-body text-foreground-secondary mt-3">{entity.description}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="tp-data-label">Resolution confidence</div>
            <div className="mt-1">
              <ConfidenceIndicator value={entity.confidence} size="md" />
            </div>
          </div>
          <div>
            <div className="tp-data-label">Sources</div>
            <div className="text-subheading text-foreground mt-0.5">{entity.sourcesCount}</div>
          </div>
          <div>
            <div className="tp-data-label">Connections</div>
            <div className="text-subheading text-foreground mt-0.5">{entity.connectionsCount}</div>
          </div>
          <div>
            <div className="tp-data-label">Last updated</div>
            <div className="text-subheading text-foreground mt-0.5">{formatDate(entity.updatedAt)}</div>
          </div>
        </div>
      </div>

      {entity.aliases && entity.aliases.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-subheading text-foreground mb-2">Known aliases</h3>
          <div className="flex flex-wrap gap-1.5">
            {entity.aliases.map((alias) => (
              <Badge key={alias} variant="secondary" size="sm" className="font-mono">
                <Fingerprint className="h-3 w-3 text-foreground-muted" aria-hidden="true" />
                {alias}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {attributes.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-subheading text-foreground mb-3">Attributes</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {attributes.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-caption text-foreground-muted uppercase tracking-wider truncate">
                  {ATTRIBUTE_LABELS[key] ?? key.replace(/_/g, ' ')}
                </dt>
                <dd
                  className="text-sm text-foreground mt-0.5 truncate"
                  title={formatAttributeValue(value)}
                >
                  {formatAttributeValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {attributes.length === 0 && (
        <div className="text-caption text-foreground-muted">
          No structured attributes recorded for this entity. Confidence: {formatPercent(entity.confidence)}.
        </div>
      )}
    </div>
  );
}