import {
  getInvestigations,
  getInvestigation,
  createInvestigation,
  updateInvestigation,
  getInvestigationEntities,
  addEntityToInvestigation,
  removeEntityFromInvestigation,
  getInvestigationEvidence,
  addEvidenceToInvestigation,
  removeEvidenceFromInvestigation,
  getInvestigationFindings,
  createFinding,
  updateFinding,
  getInvestigationNotes,
  createNote,
  updateNote,
  deleteNote,
  getInvestigationTimeline,
  getInvestigationActivity,
  getInvestigationMembers,
  getInvestigationNetworks,
  getInvestigationAnalyticsSnapshots,
  getEntityLinkCandidates,
} from './investigation.service';
import { mockInvestigationRecords } from '@/mock/investigations';
import type { MockInvestigationRecord } from '@/mock/investigations';

// The service mutates the shared mock records in place. Snapshot each
// record up front and restore it after every test so mutation tests are
// fully isolated from one another regardless of execution order.
const baseline = new Map<string, MockInvestigationRecord>();
for (const r of mockInvestigationRecords) {
  baseline.set(r.investigation.id, {
    ...r,
    entities: [...r.entities],
    relationships: [...r.relationships],
    evidence: [...r.evidence],
    findings: [...r.findings],
    notes: [...r.notes],
  });
}

afterEach(() => {
  for (const r of mockInvestigationRecords) {
    const b = baseline.get(r.investigation.id)!;
    r.entities = [...b.entities];
    r.relationships = [...b.relationships];
    r.evidence = [...b.evidence];
    r.findings = [...b.findings];
    r.notes = [...b.notes];
    r.investigation.entity_count = b.investigation.entity_count;
    r.investigation.evidence_count = b.investigation.evidence_count;
    r.investigation.relationship_count = b.investigation.relationship_count;
  }
});

describe('investigation.service — read API', () => {
  it('lists the deterministic investigation universe', async () => {
    const invs = await getInvestigations();
    expect(invs.map((i) => i.id)).toEqual([
      'inv-001',
      'inv-002',
      'inv-003',
      'inv-004',
      'inv-005',
      'inv-006',
    ]);
    expect(invs[0].title).toBe('Operation Clean — Firmware Import Probe');
  });

  it('fetches a single investigation by id', async () => {
    const inv = await getInvestigation('inv-003');
    expect(inv.status).toBe('under_review');
    expect(inv.priority).toBe('critical');
    expect(inv.case_id).toBe('ent-case-001');
  });

  it('throws for an unknown investigation', async () => {
    await expect(getInvestigation('nope')).rejects.toThrow(
      'Investigation not found'
    );
  });

  it('returns linked entities, evidence, findings and notes for inv-001', async () => {
    const [entities, evidence, findings, notes] = await Promise.all([
      getInvestigationEntities('inv-001'),
      getInvestigationEvidence('inv-001'),
      getInvestigationFindings('inv-001'),
      getInvestigationNotes('inv-001'),
    ]);
    expect(entities.length).toBe(6);
    expect(evidence.length).toBe(5);
    expect(findings.length).toBe(2);
    expect(notes.length).toBe(1);
    expect(entities[0].entity_id).toBe('ent-person-001');
    // Evidence added via the UI must be clearly marked demo-only.
    expect(evidence.every((e) => e.metadata?.is_mock === false)).toBe(true);
  });

  it('sorts the timeline newest-first', async () => {
    const timeline = await getInvestigationTimeline('inv-001');
    expect(timeline.length).toBe(3);
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i - 1].timestamp >= timeline[i].timestamp).toBe(true);
    }
  });

  it('returns members, networks and analytics snapshots', async () => {
    const [members, networks, snapshots] = await Promise.all([
      getInvestigationMembers('inv-001'),
      getInvestigationNetworks('inv-001'),
      getInvestigationAnalyticsSnapshots('inv-001'),
    ]);
    expect(members.map((m) => m.name)).toContain('Inspector Mehta');
    expect(networks[0].network_id).toBe('NET-001');
    expect(snapshots[0].label).toBe('Opening snapshot');
  });

  it('returns activity newest-first', async () => {
    const activity = await getInvestigationActivity('inv-001');
    expect(activity.length).toBe(5);
    for (let i = 1; i < activity.length; i++) {
      expect(activity[i - 1].at >= activity[i].at).toBe(true);
    }
  });

  it('flags already-linked candidates in the link catalogue', () => {
    const candidates = getEntityLinkCandidates('inv-001');
    const linked = candidates.find((c) => c.id === 'ent-person-001');
    const free = candidates.find((c) => c.id === 'ent-person-005');
    expect(linked?.alreadyLinked).toBe(true);
    expect(free?.alreadyLinked).toBe(false);
  });
});

describe('investigation.service — create / update', () => {
  it('creates a new investigation with defaults', async () => {
    const created = await createInvestigation({
      title: 'New Probe',
      description: 'Draft probe',
    });
    expect(created.id).toBe('inv-007');
    expect(created.status).toBe('draft');
    expect(created.priority).toBe('normal');
    expect(created.lead_investigator).toBe('Unassigned');
    expect(created.entity_count).toBe(0);
    expect(created.evidence_count).toBe(0);
  });

  it('applies a patch via updateInvestigation', async () => {
    const updated = await updateInvestigation('inv-001', {
      title: 'Renamed Probe',
      priority: 'critical',
    });
    expect(updated.title).toBe('Renamed Probe');
    expect(updated.priority).toBe('critical');
  });

  it('adds and removes an entity reference', async () => {
    const before = (await getInvestigationEntities('inv-002')).length;
    const added = await addEntityToInvestigation('inv-002', {
      id: 'ine-002-tmp',
      entity_id: 'ent-person-005',
      name: 'Meera Reddy',
      entity_type: 'person',
      association_confidence: 0.5,
      role: 'Referenced',
      linked_by: 'Tester',
      linked_at: new Date().toISOString(),
      metadata: {},
    });
    expect(added.investigation_id).toBe('inv-002');
    const afterAdd = await getInvestigationEntities('inv-002');
    expect(afterAdd.length).toBe(before + 1);
    expect(afterAdd.some((e) => e.id === added.id)).toBe(true);

    await removeEntityFromInvestigation('inv-002', added.id);
    const afterRemove = await getInvestigationEntities('inv-002');
    expect(afterRemove.length).toBe(before);
  });

  it('adds demo evidence flagged is_mock and removes it', async () => {
    const before = (await getInvestigationEvidence('inv-002')).length;
    const added = await addEvidenceToInvestigation(
      'inv-002',
      {
        evidence_id: 'ev-012',
        title: 'Demo record',
        evidence_type: 'document',
        summary: 'Added during a live demo session.',
        linked_by: 'Tester',
      },
      true
    );
    expect(added.metadata?.is_mock).toBe(true);
    const afterAdd = await getInvestigationEvidence('inv-002');
    expect(afterAdd.length).toBe(before + 1);
    expect(afterAdd.some((e) => e.id === added.id)).toBe(true);

    await removeEvidenceFromInvestigation('inv-002', added.id);
    const afterRemove = await getInvestigationEvidence('inv-002');
    expect(afterRemove.length).toBe(before);
  });

  it('creates and updates a finding', async () => {
    const before = (await getInvestigationFindings('inv-002')).length;
    const created = await createFinding('inv-002', {
      title: 'Bridge association',
      description: 'A structural observation between two endpoints.',
      category: 'association',
      confidence: 'medium',
      created_by: 'Analyst Singh',
      entity_ids: ['ent-person-001'],
      tags: ['bridge'],
    });
    expect(created.source_type).toBe('manual');
    const afterCreate = await getInvestigationFindings('inv-002');
    expect(afterCreate.length).toBe(before + 1);
    expect(afterCreate.some((f) => f.id === created.id)).toBe(true);

    const updated = await updateFinding('inv-002', created.id, {
      confidence: 'high',
    });
    expect(updated.confidence).toBe('high');
  });

  it('creates, updates and deletes a note', async () => {
    const before = (await getInvestigationNotes('inv-002')).length;
    const created = await createNote('inv-002', {
      author: 'Analyst Singh',
      body: 'Initial note',
      category: 'scope',
    });
    const afterCreate = await getInvestigationNotes('inv-002');
    expect(afterCreate.length).toBe(before + 1);
    expect(afterCreate.some((n) => n.id === created.id)).toBe(true);

    const updated = await updateNote('inv-002', created.id, { body: 'Updated note' });
    expect(updated.body).toBe('Updated note');

    await deleteNote('inv-002', created.id);
    const afterDelete = await getInvestigationNotes('inv-002');
    expect(afterDelete.length).toBe(before);
  });
});
