import { useInvestigationStore } from '@/state/investigation.store';
import { mockInvestigationRecords } from '@/mock/investigations';
import type { MockInvestigationRecord } from '@/mock/investigations';

// The store fires optimistic writes at the (mock-backed) service, which
// mutates the shared records in place. Snapshot and restore after each
// test so mutation tests are isolated from one another.
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
  useInvestigationStore.setState({
    investigationId: null,
    data: {
      investigation: null,
      entities: [],
      relationships: [],
      evidence: [],
      findings: [],
      notes: [],
      timeline: [],
      activity: [],
      members: [],
      networks: [],
      analyticsSnapshots: [],
    },
    loading: false,
    error: null,
    dirty: false,
  });
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

const defaultState = () => ({
  investigationId: null,
  data: {
    investigation: null,
    entities: [],
    relationships: [],
    evidence: [],
    findings: [],
    notes: [],
    timeline: [],
    activity: [],
    members: [],
    networks: [],
    analyticsSnapshots: [],
  },
  loading: false,
  error: null,
  dirty: false,
});

describe('investigation.store — loading', () => {
  beforeEach(() => {
    useInvestigationStore.setState(defaultState() as never, false);
  });

  it('loads the full workspace for an investigation', async () => {
    const s = useInvestigationStore.getState();
    await s.loadInvestigation('inv-001');
    const after = useInvestigationStore.getState();
    expect(after.loading).toBe(false);
    expect(after.error).toBeNull();
    expect(after.data.investigation?.id).toBe('inv-001');
    expect(after.data.investigation?.status).toBe('active');
    expect(after.data.entities.length).toBeGreaterThan(0);
    expect(after.data.evidence.length).toBeGreaterThan(0);
    expect(after.data.findings.length).toBeGreaterThan(0);
    expect(after.data.networks.length).toBeGreaterThan(0);
  });

  it('surfaces an error for an unknown id', async () => {
    await useInvestigationStore.getState().loadInvestigation('nope');
    const after = useInvestigationStore.getState();
    expect(after.error).toMatch(/not found/i);
    expect(after.loading).toBe(false);
  });

  it('clear resets the workspace', async () => {
    await useInvestigationStore.getState().loadInvestigation('inv-001');
    useInvestigationStore.getState().clear();
    const after = useInvestigationStore.getState();
    expect(after.investigationId).toBeNull();
    expect(after.data.investigation).toBeNull();
    expect(after.dirty).toBe(false);
  });
});

describe('investigation.store — optimistic edits & dirty tracking', () => {
  beforeEach(async () => {
    useInvestigationStore.setState(defaultState() as never, false);
    await useInvestigationStore.getState().loadInvestigation('inv-001');
  });

  it('updateInvestigationMeta marks the workspace dirty', () => {
    expect(useInvestigationStore.getState().dirty).toBe(false);
    useInvestigationStore.getState().updateInvestigationMeta({ title: 'Updated' });
    const after = useInvestigationStore.getState();
    expect(after.dirty).toBe(true);
    expect(after.data.investigation?.title).toBe('Updated');
  });

  it('linkEntity adds an entity and bumps the count, unlink removes it', () => {
    const before = useInvestigationStore.getState().data.entities.length;
    useInvestigationStore.getState().linkEntity({
      entity_id: 'ent-person-005',
      name: 'Meera Reddy',
      entity_type: 'person',
      role: 'Referenced',
      association_confidence: 0.5,
      linked_by: 'Current investigator',
    });
    let state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.entities.length).toBe(before + 1);
    expect(state.data.investigation?.entity_count).toBe(before + 1);
    const added = state.data.entities[0];
    expect(added.entity_id).toBe('ent-person-005');

    useInvestigationStore.getState().unlinkEntity(added.id);
    state = useInvestigationStore.getState();
    expect(state.data.entities.length).toBe(before);
    expect(state.data.entities.some((e) => e.id === added.id)).toBe(false);
  });

  it('linkEvidence tags demo data as is_mock and unlink removes it', () => {
    const before = useInvestigationStore.getState().data.evidence.length;
    useInvestigationStore.getState().linkEvidence({
      evidence_id: 'ev-012',
      title: 'Demo record',
      evidence_type: 'document',
      summary: 'Live demo evidence',
      linked_by: 'Current investigator',
      isMock: true,
    });
    let state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.evidence.length).toBe(before + 1);
    expect(state.data.evidence[0].metadata?.is_mock).toBe(true);
    const added = state.data.evidence[0];

    useInvestigationStore.getState().unlinkEvidence(added.id);
    state = useInvestigationStore.getState();
    expect(state.data.evidence.length).toBe(before);
  });

  it('addFinding and editFinding mark dirty and update the entry', () => {
    const before = useInvestigationStore.getState().data.findings.length;
    useInvestigationStore.getState().addFinding({
      title: 'New observation',
      description: 'An analytical observation.',
      category: 'association',
      confidence: 'medium',
      created_by: 'Analyst Singh',
    });
    let state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.findings.length).toBe(before + 1);
    const added = state.data.findings[0];
    expect(added.source_type).toBe('manual');

    useInvestigationStore.getState().editFinding(added.id, { confidence: 'high' });
    state = useInvestigationStore.getState();
    expect(state.data.findings[0].confidence).toBe('high');
  });

  it('addNote, editNote and removeNote manage the note list', () => {
    const before = useInvestigationStore.getState().data.notes.length;
    useInvestigationStore.getState().addNote({
      author: 'Current investigator',
      body: 'Working note',
      category: 'scope',
    });
    let state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.notes.length).toBe(before + 1);
    const added = state.data.notes[0];
    expect(added.body).toBe('Working note');

    useInvestigationStore.getState().editNote(added.id, { body: 'Updated' });
    state = useInvestigationStore.getState();
    expect(state.data.notes[0].body).toBe('Updated');

    useInvestigationStore.getState().removeNote(added.id);
    state = useInvestigationStore.getState();
    expect(state.data.notes.length).toBe(before);
  });

  it('setDirty clears the unsaved-changes flag', () => {
    useInvestigationStore.getState().setDirty(true);
    expect(useInvestigationStore.getState().dirty).toBe(true);
    useInvestigationStore.getState().setDirty(false);
    expect(useInvestigationStore.getState().dirty).toBe(false);
  });
});
