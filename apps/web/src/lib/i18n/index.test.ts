import {
  chromeText,
  HI_CHROME,
  TA_CHROME,
  TE_CHROME,
  KN_CHROME,
  ML_CHROME,
  MR_CHROME,
  BN_CHROME,
  APP_LANGUAGES,
} from '@/lib/i18n';

// ============================================================
// KNOWLEDGE CANVAS — I18N CHROME DICTIONARY (Tier 1.4)
// ============================================================
// Guards the 8-language chrome mapping (en/hi/ta/te/kn/ml/mr/bn):
// English falls through unchanged, each non-English dictionary is
// non-empty, every entry differs from its English source, and the
// language list is exhaustive.
// ============================================================

const NON_ENGLISH_MAPS = {
  hi: HI_CHROME,
  ta: TA_CHROME,
  te: TE_CHROME,
  kn: KN_CHROME,
  ml: ML_CHROME,
  mr: MR_CHROME,
  bn: BN_CHROME,
} as const;

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

  it('translates known chrome keys in every supported language', () => {
    for (const lang of ['ta', 'te', 'kn', 'ml', 'mr', 'bn'] as const) {
      expect(chromeText(lang, 'Knowledge Canvas')).not.toBe('Knowledge Canvas');
      expect(chromeText(lang, 'Investigations')).not.toBe('Investigations');
      expect(chromeText(lang, 'Network')).not.toBe('Network');
      expect(chromeText(lang, 'Language')).not.toBe('Language');
    }
  });

  it('falls back to the English source when no translation exists', () => {
    expect(chromeText('hi', 'Analysis engine')).toBe('Analysis engine');
    expect(chromeText('ta', 'Analysis engine')).toBe('Analysis engine');
    expect(chromeText('hi', '')).toBe('');
  });
});

describe('chrome dictionaries', () => {
  it('exposes exactly the 8 supported languages', () => {
    expect(APP_LANGUAGES).toEqual([
      'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn',
    ]);
  });

  it('every non-English dictionary is non-empty and each value differs from its key', () => {
    for (const map of Object.values(NON_ENGLISH_MAPS)) {
      expect(Object.keys(map).length).toBeGreaterThan(0);
      for (const [key, value] of Object.entries(map)) {
        expect(value).not.toBe(key);
        expect(value.trim()).not.toHaveLength(0);
      }
    }
  });
});