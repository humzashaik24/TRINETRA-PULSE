// ============================================================
// KNOWLEDGE CANVAS — APP CHROME LOCALIZATION (Tier 1.4)
// ============================================================
// English + 7 Indian languages toggle for the application chrome
// (navigation rail, breadcrumbs, command bar, workspace titles and
// the knowledge-canvas section headers): हिंदी, தமிழ், తెలుగు,
// ಕನ್ನಡ, മലയാളം, मराठी and বাংলা. Data values, entity names and
// analytical content are intentionally NOT translated — only the
// chrome is localized. `chromeText(lang, english)` falls back to the
// English string when no entry exists for the language, so adding
// chrome labels stays safe by default.
// ============================================================

import { useAppStore } from '@/state/app.store';

export type AppLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn';

export const APP_LANGUAGES: readonly AppLanguage[] = [
  'en',
  'hi',
  'ta',
  'te',
  'kn',
  'ml',
  'mr',
  'bn',
];

/** Native self-names for the language picker in Settings. */
export const LANGUAGE_NATIVE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  bn: 'বাংলা',
};

/** हिंदी chrome strings. */
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

  // Settings chrome
  Language: 'भाषा',
  Theme: 'थीम',
};

/** தமிழ் chrome strings. */
export const TA_CHROME: Record<string, string> = {
  Overview: 'கண்ணோட்டம்',
  Investigations: 'விசாரணைகள்',
  Data: 'தரவு',
  Entities: 'நிறுவனங்கள்',
  Networks: 'பிணையங்கள்',
  Evidence: 'சான்றுகள்',
  Analytics: 'பகுப்பாய்வு',
  Patterns: 'வடிவங்கள்',
  'Knowledge Canvas': 'அறிவு கேன்வாஸ்',
  Reports: 'அறிக்கைகள்',
  Settings: 'அமைப்புகள்',
  Profile: 'சுயவிவரம்',
  User: 'பயனர்',
  Intelligence: 'புலனாய்வு',
  Operations: 'நடவடிக்கைகள்',
  Analysis: 'பகுப்பாய்வு',
  Workspace: 'பணியிடம்',

  'Data Intelligence': 'தரவு புலனாய்வு',
  'Entity Intelligence': 'நிறுவன புலனாய்வு',
  'AI Assistant': 'AI உதவியாளர்',
  'User Profile': 'பயனர் சுயவிவரம்',
  'Intelligence Overview': 'புலனாய்வு கண்ணோட்டம்',

  'Search intelligence...': 'புலனாய்வு தேடு…',
  Notifications: 'அறிவிப்புகள்',
  'Mark all read': 'அனைத்தையும் படித்தவை எனக் குறி',
  'No notifications': 'அறிவிப்புகள் இல்லை',
  'All systems operational': 'அனைத்து அமைப்புகளும் செயல்படுகின்றன',
  'Profile Settings': 'சுயவிவர அமைப்புகள்',
  Preferences: 'விருப்பங்கள்',
  'Sign Out': 'வெளியேறு',
  Admin: 'நிர்வாகி',
  Analyst: 'பகுப்பாய்வாளர்',
  Collapse: 'சுருக்கு',
  'Collapse navigation rail': 'வழிசெலுத்தல் கீற்றைச் சுருக்கு',
  'Expand navigation rail': 'வழிசெலுத்தல் கீற்றை விரி',
  'Expand rail': 'கீற்றை விரி',
  'Search (Ctrl+K)': 'தேடு (Ctrl+K)',
  'Light mode': 'ஒளி முறை',
  'Dark mode': 'இருள் முறை',
  'Toggle theme': 'தீம் மாற்று',
  'System status': 'அமைப்பு நிலை',
  'Open user menu': 'பயனர் மெனுவைத் திற',
  Breadcrumb: 'ப்ரெட்கிரம்ப்',
  'Clear context': 'சூழலை அழி',

  'Expand, report and research the investigation from raw communication data.':
    'மூல தகவல் தொடர்பு தரவிலிருந்து விசாரணையை விரிவாக்கி, அறிக்கையிட்டு, ஆராயுங்கள்.',
  'CDR / CSV': 'சிடிஆர் / சிஎஸ்வி',
  Network: 'பிணையம்',
  Report: 'அறிக்கை',
  'Legal Research': 'சட்ட ஆராய்ச்சி',
  Trinetra: 'திரிநேத்ரா',

  Language: 'மொழி',
  Theme: 'தீம்',
};

/** తెలుగు chrome strings. */
export const TE_CHROME: Record<string, string> = {
  Overview: 'అవలోకనం',
  Investigations: 'విచారణలు',
  Data: 'డేటా',
  Entities: 'సంస్థలు',
  Networks: 'నెట్‌వర్క్‌లు',
  Evidence: 'సాక్ష్యం',
  Analytics: 'విశ్లేషణలు',
  Patterns: 'నమూనాలు',
  'Knowledge Canvas': 'నాలెడ్జ్ కాన్వాస్',
  Reports: 'నివేదికలు',
  Settings: 'సెట్టింగ్‌లు',
  Profile: 'ప్రొఫైల్',
  User: 'వినియోగదారు',
  Intelligence: 'మేధస్సు',
  Operations: 'కార్యకలాపాలు',
  Analysis: 'విశ్లేషణ',
  Workspace: 'పనిస్థలం',

  'Data Intelligence': 'డేటా మేధస్సు',
  'Entity Intelligence': 'సంస్థ మేధస్సు',
  'AI Assistant': 'AI సహాయకుడు',
  'User Profile': 'వినియోగదారు ప్రొఫైల్',
  'Intelligence Overview': 'మేధస్సు అవలోకనం',

  'Search intelligence...': 'మేధస్సు కోసం వెతకండి…',
  Notifications: 'నోటిఫికేషన్‌లు',
  'Mark all read': 'అన్నీ చదివినవిగా గుర్తించండి',
  'No notifications': 'నోటిఫికేషన్‌లు లేవు',
  'All systems operational': 'అన్ని వ్యవస్థలు పనిచేస్తున్నాయి',
  'Profile Settings': 'ప్రొఫైల్ సెట్టింగ్‌లు',
  Preferences: 'ప్రాధాన్యతలు',
  'Sign Out': 'సైన్ అవుట్',
  Admin: 'నిర్వాహకుడు',
  Analyst: 'విశ్లేషకుడు',
  Collapse: 'కుదించండి',
  'Collapse navigation rail': 'నావిగేషన్ రైలును కుదించండి',
  'Expand navigation rail': 'నావిగేషన్ రైలును విస్తరించండి',
  'Expand rail': 'రైలును విస్తరించండి',
  'Search (Ctrl+K)': 'వెతకండి (Ctrl+K)',
  'Light mode': 'లైట్ మోడ్',
  'Dark mode': 'డార్క్ మోడ్',
  'Toggle theme': 'థీమ్ మార్చండి',
  'System status': 'సిస్టమ్ స్థితి',
  'Open user menu': 'వినియోగదారు మెనూ తెరవండి',
  Breadcrumb: 'బ్రెడ్‌క్రంబ్',
  'Clear context': 'సందర్భాన్ని క్లియర్ చేయండి',

  'Expand, report and research the investigation from raw communication data.':
    'ముడి సమాచార డేటా నుండి విచారణను విస్తరించండి, నివేదించండి మరియు పరిశోధించండి.',
  'CDR / CSV': 'సిడిఆర్ / సిఎస్‌వి',
  Network: 'నెట్‌వర్క్',
  Report: 'నివేదిక',
  'Legal Research': 'చట్టపరమైన పరిశోధన',
  Trinetra: 'త్రినేత్ర',

  Language: 'భాష',
  Theme: 'థీమ్',
};

/** ಕನ್ನಡ chrome strings. */
export const KN_CHROME: Record<string, string> = {
  Overview: 'ಅವಲೋಕನ',
  Investigations: 'ತನಿಖೆಗಳು',
  Data: 'ಡೇಟಾ',
  Entities: 'ಘಟಕಗಳು',
  Networks: 'ನೆಟ್‌ವರ್ಕ್‌ಗಳು',
  Evidence: 'ಸಾಕ್ಷ್ಯ',
  Analytics: 'ವಿಶ್ಲೇಷಣೆ',
  Patterns: 'ಮಾದರಿಗಳು',
  'Knowledge Canvas': 'ಜ್ಞಾನ ಕ್ಯಾನ್ವಾಸ್',
  Reports: 'ವರದಿಗಳು',
  Settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  Profile: 'ಪ್ರೊಫೈಲ್',
  User: 'ಬಳಕೆದಾರ',
  Intelligence: 'ಗುಪ್ತಚರ',
  Operations: 'ಕಾರ್ಯಾಚರಣೆಗಳು',
  Analysis: 'ವಿಶ್ಲೇಷಣೆ',
  Workspace: 'ಕಾರ್ಯಕ್ಷೇತ್ರ',

  'Data Intelligence': 'ಡೇಟಾ ಗುಪ್ತಚರ',
  'Entity Intelligence': 'ಘಟಕ ಗುಪ್ತಚರ',
  'AI Assistant': 'AI ಸಹಾಯಕ',
  'User Profile': 'ಬಳಕೆದಾರ ಪ್ರೊಫೈಲ್',
  'Intelligence Overview': 'ಗುಪ್ತಚರ ಅವಲೋಕನ',

  'Search intelligence...': 'ಗುಪ್ತಚರ ಹುಡುಕಿ…',
  Notifications: 'ಅಧಿಸೂಚನೆಗಳು',
  'Mark all read': 'ಎಲ್ಲವನ್ನೂ ಓದಿದ್ದು ಎಂದು ಗುರುತಿಸಿ',
  'No notifications': 'ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
  'All systems operational': 'ಎಲ್ಲಾ ವ್ಯವಸ್ಥೆಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ',
  'Profile Settings': 'ಪ್ರೊಫೈಲ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  Preferences: 'ಆದ್ಯತೆಗಳು',
  'Sign Out': 'ಸೈನ್ ಔಟ್',
  Admin: 'ನಿರ್ವಾಹಕ',
  Analyst: 'ವಿಶ್ಲೇಷಕ',
  Collapse: 'ಸಂಕುಚಿಸಿ',
  'Collapse navigation rail': 'ನ್ಯಾವಿಗೇಷನ್ ರೈಲ್ ಸಂಕುಚಿಸಿ',
  'Expand navigation rail': 'ನ್ಯಾವಿಗೇಷನ್ ರೈಲ್ ವಿಸ್ತರಿಸಿ',
  'Expand rail': 'ರೈಲ್ ವಿಸ್ತರಿಸಿ',
  'Search (Ctrl+K)': 'ಹುಡುಕಿ (Ctrl+K)',
  'Light mode': 'ಲೈಟ್ ಮೋಡ್',
  'Dark mode': 'ಡಾರ್ಕ್ ಮೋಡ್',
  'Toggle theme': 'ಥೀಮ್ ಬದಲಿಸಿ',
  'System status': 'ಸಿಸ್ಟಮ್ ಸ್ಥಿತಿ',
  'Open user menu': 'ಬಳಕೆದಾರ ಮೆನು ತೆರೆಯಿರಿ',
  Breadcrumb: 'ಬ್ರೆಡ್‌ಕ್ರಂಬ್',
  'Clear context': 'ಸಂದರ್ಭ ತೆರವುಗೊಳಿಸಿ',

  'Expand, report and research the investigation from raw communication data.':
    'ಕಚ್ಚಾ ಸಂವಹನ ಡೇಟಾದಿಂದ ತನಿಖೆಯನ್ನು ವಿಸ್ತರಿಸಿ, ವರದಿ ಮಾಡಿ ಮತ್ತು ಸಂಶೋಧಿಸಿ.',
  'CDR / CSV': 'ಸಿಡಿಆರ್ / ಸಿಎಸ್‌ವಿ',
  Network: 'ನೆಟ್‌ವರ್ಕ್',
  Report: 'ವರದಿ',
  'Legal Research': 'ಕಾನೂನು ಸಂಶೋಧನೆ',
  Trinetra: 'ತ್ರಿನೇತ್ರ',

  Language: 'ಭಾಷೆ',
  Theme: 'ಥೀಮ್',
};

/** മലയാളം chrome strings. */
export const ML_CHROME: Record<string, string> = {
  Overview: 'അവലോകനം',
  Investigations: 'അന്വേഷണങ്ങൾ',
  Data: 'ഡാറ്റ',
  Entities: 'സ്ഥാപനങ്ങൾ',
  Networks: 'നെറ്റ്‌വർക്കുകൾ',
  Evidence: 'തെളിവുകൾ',
  Analytics: 'വിശകലനം',
  Patterns: 'രീതികൾ',
  'Knowledge Canvas': 'ജ്ഞാന കാൻവാസ്',
  Reports: 'റിപ്പോർട്ടുകൾ',
  Settings: 'ക്രമീകരണങ്ങൾ',
  Profile: 'പ്രൊഫൈൽ',
  User: 'ഉപയോക്താവ്',
  Intelligence: 'ഇന്റലിജൻസ്',
  Operations: 'പ്രവർത്തനങ്ങൾ',
  Analysis: 'വിശകലനം',
  Workspace: 'വർക്ക്സ്പേസ്',

  'Data Intelligence': 'ഡാറ്റ ഇന്റലിജൻസ്',
  'Entity Intelligence': 'സ്ഥാപന ഇന്റലിജൻസ്',
  'AI Assistant': 'AI സഹായി',
  'User Profile': 'ഉപയോക്തൃ പ്രൊഫൈൽ',
  'Intelligence Overview': 'ഇന്റലിജൻസ് അവലോകനം',

  'Search intelligence...': 'ഇന്റലിജൻസ് തിരയുക…',
  Notifications: 'അറിയിപ്പുകൾ',
  'Mark all read': 'എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക',
  'No notifications': 'അറിയിപ്പുകൾ ഇല്ല',
  'All systems operational': 'എല്ലാ സിസ്റ്റങ്ങളും പ്രവർത്തനക്ഷമമാണ്',
  'Profile Settings': 'പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ',
  Preferences: 'മുൻഗണനകൾ',
  'Sign Out': 'സൈൻ ഔട്ട്',
  Admin: 'അഡ്മിൻ',
  Analyst: 'വിശകലന വിദഗ്ധൻ',
  Collapse: 'ചുരുക്കുക',
  'Collapse navigation rail': 'നാവിഗേഷൻ റെയിൽ ചുരുക്കുക',
  'Expand navigation rail': 'നാവിഗേഷൻ റെയിൽ വികസിപ്പിക്കുക',
  'Expand rail': 'റെയിൽ വികസിപ്പിക്കുക',
  'Search (Ctrl+K)': 'തിരയുക (Ctrl+K)',
  'Light mode': 'ലൈറ്റ് മോഡ്',
  'Dark mode': 'ഡാർക്ക് മോഡ്',
  'Toggle theme': 'തീം മാറ്റുക',
  'System status': 'സിസ്റ്റം നില',
  'Open user menu': 'ഉപയോക്തൃ മെനു തുറക്കുക',
  Breadcrumb: 'ബ്രെഡ്ക്രംബ്',
  'Clear context': 'സന്ദർഭം മായ്ക്കുക',

  'Expand, report and research the investigation from raw communication data.':
    'അസംസ്കൃത ആശയവിനിമയ ഡാറ്റയിൽ നിന്ന് അന്വേഷണം വിപുലീകരിക്കുക, റിപ്പോർട്ട് ചെയ്യുക, ഗവേഷണം നടത്തുക.',
  'CDR / CSV': 'സിഡിആർ / സിഎസ്വി',
  Network: 'നെറ്റ്‌വർക്ക്',
  Report: 'റിപ്പോർട്ട്',
  'Legal Research': 'നിയമ ഗവേഷണം',
  Trinetra: 'ത്രിനേത്ര',

  Language: 'ഭാഷ',
  Theme: 'തീം',
};

/** मराठी chrome strings. */
export const MR_CHROME: Record<string, string> = {
  Overview: 'विहंगम दृश्य',
  Investigations: 'तपास',
  Data: 'डेटा',
  Entities: 'संस्था',
  Networks: 'नेटवर्क्स',
  Evidence: 'पुरावे',
  Analytics: 'विश्लेषणे',
  Patterns: 'नमुने',
  'Knowledge Canvas': 'नॉलेज कॅन्व्हास',
  Reports: 'अहवाल',
  Settings: 'सेटिंग्ज',
  Profile: 'प्रोफाइल',
  User: 'वापरकर्ता',
  Intelligence: 'गुप्तचर',
  Operations: 'ऑपरेशन्स',
  Analysis: 'विश्लेषण',
  Workspace: 'कार्यक्षेत्र',

  'Data Intelligence': 'डेटा गुप्तचर',
  'Entity Intelligence': 'संस्था गुप्तचर',
  'AI Assistant': 'AI सहाय्यक',
  'User Profile': 'वापरकर्ता प्रोफाइल',
  'Intelligence Overview': 'गुप्तचर विहंगम दृश्य',

  'Search intelligence...': 'गुप्तचर शोधा…',
  Notifications: 'सूचना',
  'Mark all read': 'सर्व वाचलेले म्हणून चिन्हांकित करा',
  'No notifications': 'सूचना नाहीत',
  'All systems operational': 'सर्व प्रणाली कार्यरत',
  'Profile Settings': 'प्रोफाइल सेटिंग्ज',
  Preferences: 'प्राधान्ये',
  'Sign Out': 'साइन आउट',
  Admin: 'प्रशासक',
  Analyst: 'विश्लेषक',
  Collapse: 'संकुचित करा',
  'Collapse navigation rail': 'नेव्हिगेशन रेल संकुचित करा',
  'Expand navigation rail': 'नेव्हिगेशन रेल विस्तृत करा',
  'Expand rail': 'रेल विस्तृत करा',
  'Search (Ctrl+K)': 'शोधा (Ctrl+K)',
  'Light mode': 'लाइट मोड',
  'Dark mode': 'डार्क मोड',
  'Toggle theme': 'थीम बदला',
  'System status': 'सिस्टम स्थिती',
  'Open user menu': 'वापरकर्ता मेनू उघडा',
  Breadcrumb: 'ब्रेडक्रंब',
  'Clear context': 'संदर्भ साफ करा',

  'Expand, report and research the investigation from raw communication data.':
    'कच्च्या संवाद डेटावरून तपासाचा विस्तार, अहवाल आणि संशोधन करा.',
  'CDR / CSV': 'सीडीआर / सीएसव्ही',
  Network: 'नेटवर्क',
  Report: 'अहवाल',
  'Legal Research': 'कायदेशीर संशोधन',
  Trinetra: 'त्रिनेत्र',

  Language: 'भाषा',
  Theme: 'थीम',
};

/** বাংলা chrome strings. */
export const BN_CHROME: Record<string, string> = {
  Overview: 'ওভারভিউ',
  Investigations: 'তদন্ত',
  Data: 'ডেটা',
  Entities: 'সত্তা',
  Networks: 'নেটওয়ার্ক',
  Evidence: 'প্রমাণ',
  Analytics: 'বিশ্লেষণ',
  Patterns: 'প্যাটার্ন',
  'Knowledge Canvas': 'নলেজ ক্যানভাস',
  Reports: 'রিপোর্ট',
  Settings: 'সেটিংস',
  Profile: 'প্রোফাইল',
  User: 'ব্যবহারকারী',
  Intelligence: 'ইন্টেলিজেন্স',
  Operations: 'অপারেশন',
  Analysis: 'বিশ্লেষণ',
  Workspace: 'ওয়ার্কস্পেস',

  'Data Intelligence': 'ডেটা ইন্টেলিজেন্স',
  'Entity Intelligence': 'সত্তা ইন্টেলিজেন্স',
  'AI Assistant': 'AI সহকারী',
  'User Profile': 'ব্যবহারকারী প্রোফাইল',
  'Intelligence Overview': 'ইন্টেলিজেন্স ওভারভিউ',

  'Search intelligence...': 'ইন্টেলিজেন্স খুঁজুন…',
  Notifications: 'বিজ্ঞপ্তি',
  'Mark all read': 'সব পঠিত হিসাবে চিহ্নিত করুন',
  'No notifications': 'কোনো বিজ্ঞপ্তি নেই',
  'All systems operational': 'সব সিস্টেম সক্রিয়',
  'Profile Settings': 'প্রোফাইল সেটিংস',
  Preferences: 'পছন্দ',
  'Sign Out': 'সাইন আউট',
  Admin: 'অ্যাডমিন',
  Analyst: 'বিশ্লেষক',
  Collapse: 'ভাঁজ করুন',
  'Collapse navigation rail': 'নেভিগেশন রেল ভাঁজ করুন',
  'Expand navigation rail': 'নেভিগেশন রেল খুলুন',
  'Expand rail': 'রেল খুলুন',
  'Search (Ctrl+K)': 'খুঁজুন (Ctrl+K)',
  'Light mode': 'লাইট মোড',
  'Dark mode': 'ডার্ক মোড',
  'Toggle theme': 'থিম পরিবর্তন করুন',
  'System status': 'সিস্টেম অবস্থা',
  'Open user menu': 'ব্যবহারকারী মেনু খুলুন',
  Breadcrumb: 'ব্রেডক্রাম্ব',
  'Clear context': 'কনটেক্সট মুছুন',

  'Expand, report and research the investigation from raw communication data.':
    'কাঁচা যোগাযোগ ডেটা থেকে তদন্ত সম্প্রসারিত, রিপোর্ট এবং গবেষণা করুন।',
  'CDR / CSV': 'সিডিআর / সিএসভি',
  Network: 'নেটওয়ার্ক',
  Report: 'রিপোর্ট',
  'Legal Research': 'আইনি গবেষণা',
  Trinetra: 'ত্রিনেত্র',

  Language: 'ভাষা',
  Theme: 'থিম',
};

const CHROME_MAPS: Partial<
  Record<Exclude<AppLanguage, 'en'>, Record<string, string>>
> = {
  hi: HI_CHROME,
  ta: TA_CHROME,
  te: TE_CHROME,
  kn: KN_CHROME,
  ml: ML_CHROME,
  mr: MR_CHROME,
  bn: BN_CHROME,
};

export type ChromeLanguage = AppLanguage;

/** Translate one chrome string for the current language. */
export function chromeText(lang: AppLanguage, text: string): string {
  const map = CHROME_MAPS[lang as Exclude<AppLanguage, 'en'>];
  if (!map) return text;
  return map[text] ?? text;
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