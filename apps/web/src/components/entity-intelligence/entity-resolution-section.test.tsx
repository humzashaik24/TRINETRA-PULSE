import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EntityResolutionCandidate } from '@trinetra-pulse/types';
import { EntityResolutionSection } from '@/components/entity-intelligence/entity-resolution-section';

// ============================================================
// ENTITY RESOLUTION SECTION (Phase 20)
// ============================================================

const candidate: EntityResolutionCandidate = {
  id: 'res-p20-001',
  investigation_id: 'inv-006',
  entity_id_1: 'ent-person-001',
  entity_id_2: 'ent-phone-001',
  entity_1_name: 'Rahul Kumar',
  entity_2_name: '+91 98765 43210',
  entity_1_type: 'person',
  entity_2_type: 'phone',
  confidence: 'HIGH',
  linkage_score: 0.85,
  resolution_version: 'entity-resolution-v1',
  resolution_method: 'auto',
  matched_features: [
    {
      feature: 'PHONE_EXACT',
      label: 'Exact phone',
      matched: true,
      value: 'Exact match',
      weight: 0.7,
      value_1: '+91 98765 43210',
      value_2: '+91 98765 43210',
      normalized_1: '919876543210',
      normalized_2: '919876543210',
      source_1: null,
      source_2: null,
    },
    {
      feature: 'NAME_EXACT',
      label: 'Exact normalized name',
      matched: true,
      value: 'Exact match',
      weight: 0.4,
      value_1: 'Rahul Kumar',
      value_2: 'Rahul Kumar',
      normalized_1: 'rahul kumar',
      normalized_2: 'rahul kumar',
      source_1: null,
      source_2: null,
    },
  ],
  contradictions: [],
  source_refs: [{ source_dataset: 'CDR Extract', source_record: null, source_type: null, original_value: null, normalized_value: null, dataset_id: null, evidence_refs: [] }],
  matching_attributes: [],
  evidence: ['Exact phone', 'Exact normalized name'],
  verification_state: 'auto_resolved',
  last_evaluated_at: '2026-09-06T09:00:00Z',
  verified_by: null,
  verified_at: null,
  rejection_reason: null,
  metadata: {},
  created_at: '2026-09-06T09:00:00Z',
  updated_at: '2026-09-06T09:00:00Z',
};

const rejected: EntityResolutionCandidate = {
  ...candidate,
  id: 'res-p20-002',
  entity_id_2: 'ent-account-001',
  entity_2_name: '7731 0029 4567',
  linkage_score: 0.27,
  confidence: 'LOW',
  verification_state: 'rejected',
  matched_features: [],
  evidence: [],
  source_refs: [],
  verified_by: 'analyst@trinetra.local',
  rejection_reason: 'No independent corroboration',
};

describe('EntityResolutionSection', () => {
  it('renders the linkage score and confidence label', () => {
    render(<EntityResolutionSection entityId="ent-person-001" candidates={[candidate]} onConfirm={async () => {}} onReject={async () => {}} onEvaluate={async () => {}} />);
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('Auto-resolved')).toBeTruthy();
  });

  it('does not show confirm/reject for already-resolved candidates', () => {
    render(<EntityResolutionSection entityId="ent-person-001" candidates={[rejected]} onConfirm={async () => {}} onReject={async () => {}} onEvaluate={async () => {}} />);
    expect(screen.queryByText('Confirm')).toBeNull();
    expect(screen.getByText(/No independent corroboration/)).toBeTruthy();
  });

  it('renders an empty state when there are no candidates', () => {
    render(<EntityResolutionSection entityId="ent-person-001" candidates={[]} onConfirm={async () => {}} onReject={async () => {}} onEvaluate={async () => {}} />);
    expect(screen.getByText(/No identity-link candidates/)).toBeTruthy();
  });
});
