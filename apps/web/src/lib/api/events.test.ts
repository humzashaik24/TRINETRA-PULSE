/**
 * Tests for the Event detail adapter (Phase 17.9).
 *
 * Covers the persisted RealEvent -> inspector event mapping (title /
 * occurredAt / eventType / location / description preserved) and the scoped /
 * unscoped / failure loads of event detail. API failures propagate (never a
 * mock fallback).
 */

import { eventTitleFrom, loadEventDetail, mapApiEvent } from '@/lib/api/events';
import type { RealEvent } from '@/lib/api/investigations';

jest.mock('@/lib/api/investigations', () => ({
  getEvent: jest.fn(),
  getEventScoped: jest.fn(),
}));

import { getEvent, getEventScoped } from '@/lib/api/investigations';

const mockedGetEvent = jest.mocked(getEvent);
const mockedGetEventScoped = jest.mocked(getEventScoped);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const EVENT_ID = '44444444-4444-5444-8444-444444444444';

const EVENT: RealEvent = {
  id: EVENT_ID,
  investigation_id: INVESTIGATION_ID,
  event_type: 'meeting',
  timestamp: '2026-02-19T18:40:00Z',
  location: 'Chennai',
  description: 'Multiple target devices co-located.',
  metadata: { canonical_id: 'event-001' },
  created_at: '2026-02-19T18:40:00Z',
  updated_at: '2026-02-19T18:40:00Z',
};

describe('mapApiEvent / eventTitleFrom (Phase 17.9)', () => {
  it('prefers the description for the feed label, else the event type', () => {
    expect(eventTitleFrom(EVENT)).toBe('Multiple target devices co-located.');
    expect(eventTitleFrom({ ...EVENT, description: null })).toBe('meeting');
  });

  it('maps a persisted event into the inspector event shape preserving fields', () => {
    const detail = mapApiEvent(EVENT);
    expect(detail.kind).toBe('event');
    expect(detail.id).toBe(EVENT_ID);
    expect(detail.title).toBe(EVENT.description);
    expect(detail.occurredAt).toBe(EVENT.timestamp);
    expect(detail.eventType).toBe('meeting');
    expect(detail.location).toBe('Chennai');
    expect(detail.description).toBe(EVENT.description);
    expect(detail.investigationId).toBe(INVESTIGATION_ID);
  });

  it('keeps ingestion-style events honest (type + timestamps tied to row)', () => {
    const ingested: RealEvent = {
      ...EVENT,
      id: '55555555-5555-5555-8555-555555555555',
      event_type: 'ingestion_completed',
      description: "Ingestion completed for dataset 'CDR Extract'",
      location: null,
    };
    const detail = mapApiEvent(ingested);
    expect(detail.eventType).toBe('ingestion_completed');
    expect(detail.location).toBeNull();
    expect(detail.title).toContain('Ingestion completed');
  });
});

describe('loadEventDetail (Phase 17.9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads a scoped event through getEventScoped', async () => {
    mockedGetEventScoped.mockResolvedValue(EVENT);

    const detail = await loadEventDetail(EVENT_ID, INVESTIGATION_ID);

    expect(mockedGetEventScoped).toHaveBeenCalledWith(
      EVENT_ID,
      INVESTIGATION_ID,
    );
    expect(mockedGetEvent).not.toHaveBeenCalled();
    expect(detail.investigationId).toBe(INVESTIGATION_ID);
  });

  it('loads an unscoped event through getEvent', async () => {
    mockedGetEvent.mockResolvedValue(EVENT);

    const detail = await loadEventDetail(EVENT_ID);

    expect(mockedGetEvent).toHaveBeenCalledWith(EVENT_ID);
    expect(detail.id).toBe(EVENT_ID);
  });

  it('surfaces an API failure without any mock fallback', async () => {
    mockedGetEventScoped.mockRejectedValue(new Error('not_found'));

    await expect(
      loadEventDetail(EVENT_ID, INVESTIGATION_ID),
    ).rejects.toThrow('not_found');
    expect(mockedGetEvent).not.toHaveBeenCalled();
  });
});