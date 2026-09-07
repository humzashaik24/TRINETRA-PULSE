/**
 * Timeline mapping tests for the real API adapter (Phase 17.4).
 *
 * Verifies:
 *  - mapTimeline deterministically converts the /api/v2/timeline response
 *    into the InvestigationTimelineItem shape the UI consumes,
 *  - finding entries are NOT repeated (the workspace merges findings from
 *    its dedicated findings slice),
 *  - loadInvestigationWorkspace drives the mapped timeline from the
 *    official GET /api/v2/timeline/{investigationId} client call,
 *  - every mapped item is scoped to the active investigation.
 */

import { mapTimeline, loadInvestigationWorkspace } from './adapter';
import { getTimeline } from './investigations';
import type { RealTimelineEntry } from './investigations';

jest.mock('./investigations', () => ({
  createEntityForInvestigation: jest.fn(),
  createFindingForInvestigation: jest.fn(),
  createNoteForInvestigation: jest.fn(),
  getInvestigation: jest.fn(),
  getInvestigationSummary: jest.fn(),
  getNetworkAnalytics: jest.fn(),
  getNetworkGraph: jest.fn(),
  getTimeline: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  listEvidenceForInvestigation: jest.fn(),
  listEventsForInvestigation: jest.fn(),
  listFindingsForInvestigation: jest.fn(),
  listNotesForInvestigation: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
  updateInvestigation: jest.fn(),
}));

import {
  getInvestigation,
  getInvestigationSummary,
  getNetworkAnalytics,
  getNetworkGraph,
  listEntitiesForInvestigation,
  listEvidenceForInvestigation,
  listEventsForInvestigation,
  listFindingsForInvestigation,
  listNotesForInvestigation,
  listRelationshipsForInvestigation,
} from './investigations';

const mockedGetTimeline = jest.mocked(getTimeline);
const mockedGetInvestigation = jest.mocked(getInvestigation);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INV_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

const API_ENTRIES: RealTimelineEntry[] = [
  { kind: 'event', at: '2026-02-14T11:05:00Z', title: 'event', ref_id: 'evt-1', actor: null, description: 'Flagged transaction surfaced.' },
  { kind: 'note', at: '2026-02-15T10:00:00Z', title: 'Note', ref_id: 'nt-1', actor: 'Inspector Mehta', description: 'Working note.' },
  { kind: 'finding', at: '2026-02-16T10:00:00Z', title: 'Finding title', ref_id: 'fnd-1', actor: null, description: 'Finding desc.' },
  { kind: 'evidence', at: '2026-02-17T10:00:00Z', title: 'Evidence title', ref_id: 'ev-1', actor: null, description: 'Evidence desc.' },
];

// ---------------------------------------------------------------------------
// mapTimeline — pure mapping
// ---------------------------------------------------------------------------

describe('mapTimeline', () => {
  it('maps every non-finding API entry into an InvestigationTimelineItem', () => {
    const items = mapTimeline(API_ENTRIES, INV_ID);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.category)).toEqual(['event', 'note', 'evidence']);
  });

  it('filters finding entries so findings are not listed twice', () => {
    const items = mapTimeline(API_ENTRIES, INV_ID);
    expect(items.some((i) => i.category === 'finding')).toBe(false);
    expect(items.some((i) => i.title === 'Finding title')).toBe(false);
  });

  it('preserves the event timestamp', () => {
    const items = mapTimeline(API_ENTRIES, INV_ID);
    const event = items.find((i) => i.category === 'event');
    expect(event?.timestamp).toBe(new Date('2026-02-14T11:05:00Z').toISOString());
  });

  it('preserves the reference id', () => {
    const items = mapTimeline(API_ENTRIES, INV_ID);
    const note = items.find((i) => i.category === 'note');
    expect(note?.id).toBe(`tl-nt-1`);
    expect(note?.ref_id).toBe('nt-1');
    expect(note?.ref_type).toBe('note');
  });

  it('stamps investigation_id on every item', () => {
    const items = mapTimeline(API_ENTRIES, 'inv-scope-a');
    for (const item of items) {
      expect(item.investigation_id).toBe('inv-scope-a');
    }
  });

  it('handles null optional fields safely', () => {
    const items = mapTimeline(
      [{ kind: 'event', at: null, title: null, ref_id: null, actor: null, description: null }],
      INV_ID,
    );
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.title).toBe('Event');
    expect(item.description).toBeNull();
    expect(item.ref_id).toBeNull();
    expect(item.ref_type).toBe('event');
    expect(item.actor).toBeNull();
    expect(typeof item.timestamp).toBe('string');
    expect(item.timestamp.length).toBeGreaterThan(0);
  });

  it('returns an empty array for an empty timeline', () => {
    expect(mapTimeline([], INV_ID)).toEqual([]);
  });

  it('uses the index for the item id when ref_id is missing', () => {
    const items = mapTimeline(
      [
        { kind: 'event', at: null, title: 'A', ref_id: null, actor: null, description: null },
        { kind: 'note', at: null, title: 'B', ref_id: null, actor: null, description: null },
      ],
      INV_ID,
    );
    expect(items[0].id).toBe('tl-0');
    expect(items[1].id).toBe('tl-1');
  });
});

// ---------------------------------------------------------------------------
// loadInvestigationWorkspace — timeline path through the real client
// ---------------------------------------------------------------------------

describe('loadInvestigationWorkspace timeline path', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetInvestigation.mockResolvedValue({
      id: INV_ID,
      title: 'Operation Meridian',
      description: 'Demo dataset',
      status: 'active',
      priority: 'high',
      lead_investigator: 'Inspector Mehta',
      assigned_team: ['Inspector Mehta'],
      tags: ['meridian'],
      started_at: '2026-08-18T09:00:00Z',
      closed_at: null,
      metadata: {},
      created_at: '2026-08-18T09:00:00Z',
      updated_at: '2026-08-18T09:00:00Z',
    });
    jest.mocked(getInvestigationSummary).mockResolvedValue({
      id: INV_ID,
      title: 'Operation Meridian',
      status: 'active',
      priority: 'high',
      entity_count: 6,
      relationship_count: 4,
      evidence_count: 4,
      finding_count: 2,
      event_count: 3,
      note_count: 1,
      updated_at: '2026-08-18T09:00:00Z',
    });
    jest.mocked(listEntitiesForInvestigation).mockResolvedValue([]);
    jest.mocked(listRelationshipsForInvestigation).mockResolvedValue([]);
    jest.mocked(listEvidenceForInvestigation).mockResolvedValue([]);
    jest.mocked(listFindingsForInvestigation).mockResolvedValue([]);
    jest.mocked(listNotesForInvestigation).mockResolvedValue([]);
    jest.mocked(listEventsForInvestigation).mockResolvedValue([]);
    jest.mocked(getNetworkGraph).mockResolvedValue({ investigation_id: INV_ID, nodes: [], edges: [] });
    jest.mocked(getNetworkAnalytics).mockResolvedValue({
      investigation_id: INV_ID,
      entity_count: 0,
      relationship_count: 0,
      connected_components: 0,
      average_degree: 0,
      flagged_entity_count: 0,
      verified_entity_count: 0,
      high_risk_entity_count: 0,
    });
    mockedGetTimeline.mockResolvedValue({
      investigation_id: INV_ID,
      entries: [...API_ENTRIES],
    });
  });

  it('calls the official timeline client with the active investigation id', async () => {
    await loadInvestigationWorkspace(INV_ID);
    expect(getTimeline).toHaveBeenCalledWith(INV_ID);
  });

  it('maps the official timeline response into the workspace timeline', async () => {
    const workspace = await loadInvestigationWorkspace(INV_ID);
    expect(workspace.timeline).toHaveLength(3);
    expect(workspace.timeline.map((t) => t.category)).toEqual(['event', 'note', 'evidence']);
    expect(workspace.timeline[0].investigation_id).toBe(INV_ID);
  });

  it('excludes finding entries from the mapped timeline', async () => {
    const workspace = await loadInvestigationWorkspace(INV_ID);
    expect(workspace.timeline.some((t) => t.category === 'finding')).toBe(false);
  });

  it('scopes the timeline to the loaded investigation only', async () => {
    const other = '00000000-0000-0000-0000-000000000099';
    mockedGetInvestigation.mockResolvedValue({
      id: other,
      title: 'Other Investigation',
      description: null,
      status: 'active',
      priority: 'normal',
      lead_investigator: null,
      assigned_team: [],
      tags: [],
      started_at: null,
      closed_at: null,
      metadata: {},
      created_at: '2026-08-18T09:00:00Z',
      updated_at: '2026-08-18T09:00:00Z',
    });
    mockedGetTimeline.mockResolvedValue({
      investigation_id: other,
      entries: [
        { kind: 'event', at: '2026-03-01T09:00:00Z', title: 'Other event', ref_id: 'evt-other', actor: null, description: null },
        { kind: 'evidence', at: '2026-03-02T09:00:00Z', title: 'Other evidence', ref_id: 'ev-other', actor: null, description: null },
      ],
    });

    const workspace = await loadInvestigationWorkspace(other);
    expect(workspace.timeline).toHaveLength(2);
    expect(workspace.timeline.every((t) => t.investigation_id === other)).toBe(true);
    expect(workspace.timeline.some((t) => t.title === 'Other event')).toBe(true);
  });

  it('falls back to an empty timeline when the timeline request fails', async () => {
    mockedGetTimeline.mockRejectedValue(new Error('timeline unavailable'));
    const workspace = await loadInvestigationWorkspace(INV_ID);
    expect(workspace.timeline).toEqual([]);
  });

  it('throws when the investigation itself cannot be loaded', async () => {
    mockedGetInvestigation.mockRejectedValue(new Error('Could not load investigation'));
    await expect(loadInvestigationWorkspace(INV_ID)).rejects.toThrow(
      /could not load investigation/i,
    );
  });
});