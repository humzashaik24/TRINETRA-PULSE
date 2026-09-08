/**
 * Tests for the Note detail adapter (Phase 17.9).
 *
 * Covers the persisted RealNote -> inspector note mapping (author / body /
 * category) and the scoped / unscoped / failure loads of note detail. API
 * failures propagate (never a mock fallback).
 */

import { loadNoteDetail, mapApiNote, noteCategoryFrom } from '@/lib/api/notes';
import type { RealNote } from '@/lib/api/investigations';

jest.mock('@/lib/api/investigations', () => ({
  getNote: jest.fn(),
  getNoteScoped: jest.fn(),
}));

import { getNote, getNoteScoped } from '@/lib/api/investigations';

const mockedGetNote = jest.mocked(getNote);
const mockedGetNoteScoped = jest.mocked(getNoteScoped);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const NOTE_ID = '66666666-6666-5666-8666-666666666666';

const NOTE: RealNote = {
  id: NOTE_ID,
  investigation_id: INVESTIGATION_ID,
  content: 'Demo journey anchor.',
  author: 'Inspector Mehta',
  metadata: { canonical_id: 'inn-006-1', category: 'hypothesis' },
  created_at: '2026-08-18T09:00:00Z',
  updated_at: '2026-08-18T09:00:00Z',
};

describe('mapApiNote / noteCategoryFrom (Phase 17.9)', () => {
  it('reads the optional category from metadata', () => {
    expect(noteCategoryFrom(NOTE)).toBe('hypothesis');
    expect(noteCategoryFrom({ ...NOTE, metadata: {} })).toBeNull();
  });

  it('maps a persisted note into the inspector note shape', () => {
    const detail = mapApiNote(NOTE);
    expect(detail.kind).toBe('note');
    expect(detail.id).toBe(NOTE_ID);
    expect(detail.investigationId).toBe(INVESTIGATION_ID);
    expect(detail.author).toBe('Inspector Mehta');
    expect(detail.body).toBe('Demo journey anchor.');
    expect(detail.category).toBe('hypothesis');
  });
});

describe('loadNoteDetail (Phase 17.9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads a scoped note through getNoteScoped', async () => {
    mockedGetNoteScoped.mockResolvedValue(NOTE);

    const detail = await loadNoteDetail(NOTE_ID, INVESTIGATION_ID);

    expect(mockedGetNoteScoped).toHaveBeenCalledWith(
      NOTE_ID,
      INVESTIGATION_ID,
    );
    expect(mockedGetNote).not.toHaveBeenCalled();
    expect(detail.author).toBe('Inspector Mehta');
  });

  it('loads an unscoped note through getNote', async () => {
    mockedGetNote.mockResolvedValue(NOTE);

    const detail = await loadNoteDetail(NOTE_ID);

    expect(mockedGetNote).toHaveBeenCalledWith(NOTE_ID);
    expect(detail.id).toBe(NOTE_ID);
  });

  it('surfaces an API failure without any mock fallback', async () => {
    mockedGetNoteScoped.mockRejectedValue(new Error('not_found'));

    await expect(
      loadNoteDetail(NOTE_ID, INVESTIGATION_ID),
    ).rejects.toThrow('not_found');
    expect(mockedGetNote).not.toHaveBeenCalled();
  });
});