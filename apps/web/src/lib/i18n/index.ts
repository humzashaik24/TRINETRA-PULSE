// ============================================================
// KNOWLEDGE CANVAS — APP CHROME LOCALIZATION (Tier 1.4)
// ============================================================
// English / हिंदी toggle for the application chrome (navigation
// rail, breadcrumbs, command bar, workspace titles and the
// knowledge-canvas section headers). Data values, entity names and
// analytical content are intentionally NOT translated — only the
// chrome is localized. `chromeText(lang, english)` falls back to the
// English string when no हिंदी entry exists, so adding chrome labels
// stays safe by default.
// ============================================================

import { useAppStore } from '@/state/app.store';

export type AppLanguage = 'en' | 'hi';

export const APP_LANGUAGES: AppLanguage[] = ['en', 'hi'];

/** Balanced: chrome strings only, with the हिंदी rendering. */
export const HI_CHROME: Record<string, string> = {
  // Rail labels
  Overview: 'अवलोकन',
  Investigations: 'जाँचें',
  Data: 'डेटा',
  Entities: 'संस्थाएँ',
  Networks: 'नेटवर्क',
  Evidence: 'साक्ष्य',
  Analytics: 'विश्लेषण',
  Patterns: 'पैटर्न',
  'Knowledge Canvas': 'नॉलेज कैनवास',
  Reports: 'रिपोर्टें',
  Settings: 'सेटिंग्स',
  Profile: 'प्रोफ़ाइल',
  User: 'उपयोगकर्ता',
  Intelligence: 'ख़ुफ़िया',
  Operations: 'अभियान',
  Analysis: 'विश्लेषण',
  Workspace: 'कार्यक्षेत्र',

  // Breadcrumbs / workspace titles
  'Data Intelligence': 'डेटा इंटेलिजेंस',
  'Entity Intelligence': 'इकाई इंटेलिजेंस',
  'AI Assistant': 'AI सहायक',
  'User Profile': 'उपयोगकर्ता प्रोफ़ाइल',
  'Intelligence Overview': 'इंटेलिजेंस अवलोकन',

  // Command bar
  'Search intelligence...': 'खुफिया खोजें…',
  Notifications: 'सूचनाएं',
  'Mark all read': 'सभी को पढ़ा हुआ चिह्नित करें',
  'No notifications': 'कोई सूचना नहीं',
  'All systems operational': 'सभी प्रणालियाँ सक्रिय',
  'Profile Settings': 'प्रोफ़ाइल सेटिंग्स',
  Preferences: 'वरीयताएँ',
  'Sign Out': 'साइन आउट',
  Admin: 'प्रशासक',
  Analyst: 'विश्लेषक',
  Collapse: 'बंद करें',
  'Collapse navigation rail': 'नेविगेशन रेल बंद करें',
  'Expand navigation rail': 'नेविगेशन रेल खोलें',
  'Expand rail': 'रेल खोलें',
  'Search (Ctrl+K)': 'खोजें (Ctrl+K)',
  'Light mode': 'लाइट मोड',
  'Dark mode': 'डार्क मोड',
  'Toggle theme': 'थीम बदलें',
  'System status': 'सिस्टम स्थिति',
  'Open user menu': 'उपयोगकर्ता मेनू खोलें',
  Breadcrumb: 'ब्रेडक्रंब',
  'Clear context': 'संदर्भ साफ़ करें',

  // Knowledge canvas chrome
  'Expand, report and research the investigation from raw communication data.':
    'कच्चे संचार डेटा से जाँच का विस्तार, रिपोर्ट और शोध करें।',
  'CDR / CSV': 'सीडीआर / सीएसवी',
  Network: 'नेटवर्क',
  Report: 'रिपोर्ट',
  'Legal Research': 'कानूनी शोध',
  Trinetra: 'त्रिनेत्र',
};

export type ChromeLanguage = AppLanguage;

/** Translate one chrome string for the current language. */
export function chromeText(lang: AppLanguage, text: string): string {
  if (lang !== 'hi') return text;
  return HI_CHROME[text] ?? text;
}

/** React binding for the active chrome language. */
export function useChromeLanguage(): AppLanguage {
  return useAppStore((s) => s.language);
}

/** The current language + toggle action. */
export function useLanguageToggle() {
  const language = useChromeLanguage();
  const setLanguage = useAppStore((s) => s.setLanguage);
  return { language, setLanguage };
}