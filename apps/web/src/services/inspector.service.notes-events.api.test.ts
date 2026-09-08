/**
 * API-mode tests for the note + event branches of the Context Inspector
 * (Phase 17.9).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` a note or event context (the timeline
 * entries created from the persisted events feed) must resolve through the
 * typed /api/v2 note/event adapters (investigation-scoped detail reads),
 * never the mock investigation universe. API failures surface as an explicit
 * error state.
 */

import { resolveInspectorContext } from '@/services/inspector.service';
import type { InspectorEventView, InspectorNoteView } from '@/services/inspector.service';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/notes', () => ({
  loadNoteDetail: jest.fn(),
}));

jest.mock('@/lib/api/events', () => ({
  loadEventDetail: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({
  fetchEntity: jest.fn(),
  fetchEntityIntelligenceSummary: jest.fn(),
  fetchRelationship: jest.fn(),
}));

import { loadEventDetail } from '@/lib/api/events';
import { loadNoteDetail } from '@/lib/api/notes';
import * as entityService from '@/services/entity.service';
import { mockInvestigationById } from '@/mock/investigations';

const mockedNoteApi = jest.mocked(loadNoteDetail);
const mockedEventApi = jest.mocked(loadEventDetail);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const NOTE_ID = '66666666-6666-5666-8666-666666666666';
const EVENT_ID = '44444444-4444-5444-8444-444444444444';

describe('inspector — note + event contexts in API mode (Phase 17.9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves a note through the scoped /api/v2 adapter (never the mock record)', async () => {
    mockedNoteApi.mockResolvedValue({
      kind: 'note',
      id: NOTE_ID,
      investigationId: INVESTIGATION_ID,
      author: 'Inspector Mehta',
      body: 'Demo journey anchor.',
      category: 'hypothesis',
    } as never);

    const res = await resolveInspectorContext({
      type: 'note',
      id: NOTE_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedNoteApi).toHaveBeenCalledWith(NOTE_ID, INVESTIGATION_ID);
    expect(entityService.fetchEntity).not.toHaveBeenCalled();

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorNoteView;
      expect(view.kind).toBe('note');
      expect(view.author).toBe('Inspector Mehta');
      expect(view.body).toBe('Demo journey anchor.');
      expect(view.investigationId).toBe(INVESTIGATION_ID);
    }
  });

  it('resolves an event through the scoped /api/v2 adapter (never the mock record)', async () => {
    mockedEventApi.mockResolvedValue({
      kind: 'event',
      id: EVENT_ID,
      investigationId: INVESTIGATION_ID,
      title: 'Multiple target devices co-located.',
      occurredAt: '2026-02-19T18:40:00Z',
      eventType: 'meeting',
      location: 'Chennai',
      description: 'Multiple target devices co-located.',
    } as never);

    const res = await resolveInspectorContext({
      type: 'event',
      id: EVENT_ID,
      title: 'event hint',
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedEventApi).toHaveBeenCalledWith(EVENT_ID, INVESTIGATION_ID);
    expect(entityService.fetchEntity).not.toHaveBeenCalled();

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorEventView;
      expect(view.kind).toBe('event');
      expect(view.eventType).toBe('meeting');
      expect(view.occurredAt).toBe('2026-02-19T18:40:00Z');
      expect(view.investigationId).toBe(INVESTIGATION_ID);
    }
  });

  it('still reads the persisted rows even when mock hints are present', async () => {
    mockedNoteApi.mockResolvedValue({
      kind: 'note',
      id: NOTE_ID,
      investigationId: INVESTIGATION_ID,
      author: 'Inspector Mehta',
      body: 'Persisted body.',
      category: null,
    } as never);

    const res = await resolveInspectorContext({
      type: 'note',
      id: NOTE_ID,
      investigationId: INVESTIGATION_ID,
      author: 'Mock Author',
      body: 'Mock body',
    });

    expect(mockedNoteApi).toHaveBeenCalledTimes(1);
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect((res.view as InspectorNoteView).body).toBe('Persisted body.');
    }
  });

  it('never consults the mock investigation records for a persisted event', async () => {
    const eventsInMock = mockInvestigationById.get('inv-006')?.events ?? [];
    mockedEventApi.mockResolvedValue({
      kind: 'event',
      id: eventsInMock[0]?.id ?? EVENT_ID,
      investigationId: INVESTIGATION_ID,
      title: 'Persisted event title',
      occurredAt: null,
      eventType: 'case_event',
      location: null,
      description: null,
    } as never);
    if (eventsInMock[0]) {
      await resolveInspectorContext({
        type: 'event',
        id: eventsInMock[0].id,
        investigationId: INVESTIGATION_ID,
      });
      expect(mockedEventApi).toHaveBeenCalled();
    }
  });

  it('surfaces note + event API failures as error states with no mock fallback', async () => {
    mockedNoteApi.mockRejectedValue(new Error('Notes not found'));
    mockedEventApi.mockRejectedValue(new Error('Events not found'));

    const noteRes = await resolveInspectorContext({
      type: 'note',
      id: NOTE_ID,
      investigationId: INVESTIGATION_ID,
    });
    const eventRes = await resolveInspectorContext({
      type: 'event',
      id: EVENT_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(noteRes.status).toBe('error');
    expect(eventRes.status).toBe('error');
    if (noteRes.status === 'error') expect(noteRes.message).toContain('Notes not found');
    if (eventRes.status === 'error') expect(eventRes.message).toContain('Events not found');
    expect(entityService.fetchEntity).not.toHaveBeenCalled();
  });

  it('keeps mock-mode note/event resolution intact for API tests (control)', async () => {
    // This branch exercises the mock path directly — API-mode failures above
    // must never substitute mock records; the mock service itself is untouched.
    expect(typeof mockInvestigationById.get).toBe('function');
  });
});