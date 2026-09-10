import { chromeText, HI_CHROME } from '@/lib/i18n';

// ============================================================
// KNOWLEDGE CANVAS — I18N CHROME DICTIONARY (Tier 1.4)
// ============================================================
// Guards the EN/हिंदी chrome mapping: English falls through
// unchanged, the हिंदी dictionary is not empty, and each entry
// actually differs from its English source (no accidental
// no-op slash translation).
// ============================================================

describe('chromeText', () => {
  it('returns the string untouched for English', () => {
    expect(chromeText('en', 'Knowledge Canvas')).toBe('Knowledge Canvas');
    expect(chromeText('en', 'Search intelligence...')).toBe('Search intelligence...');
  });

  it('returns a हिंदी string for known chrome keys', () => {
    expect(chromeText('hi', 'Knowledge Canvas')).toBe('नॉलेज कैनवास');
    expect(chromeText('hi', 'Investigations')).toBe('जाँचें');
    expect(chromeText('hi', 'CDR / CSV')).toBe('सीडीआर / सीएसवी');
    expect(chromeText('hi', 'Legal Research')).toBe('कानूनी शोध');
  });

  it('falls back to the English source when no translation exists', () => {
    expect(chromeText('hi', 'Analysis engine')).toBe('Analysis engine');
    expect(chromeText('hi', '')).toBe('');
  });
});

describe('HI_CHROME', () => {
  it('is non-empty and every value differs from its English key', () => {
    expect(Object.keys(HI_CHROME).length).toBeGreaterThan(0);
    for (const [key, value] of Object.entries(HI_CHROME)) {
      expect(value).not.toBe(key);
      expect(value.trim()).not.toHaveLength(0);
    }
  });
});