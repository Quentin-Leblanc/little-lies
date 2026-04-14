import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// FR translations
import frCommon from './fr/common.json';
import frGame from './fr/game.json';
import frRoles from './fr/roles.json';
import frSetup from './fr/setup.json';
import frMenu from './fr/menu.json';
import frLegal from './fr/legal.json';

// EN translations
import enCommon from './en/common.json';
import enGame from './en/game.json';
import enRoles from './en/roles.json';
import enSetup from './en/setup.json';
import enMenu from './en/menu.json';
import enLegal from './en/legal.json';

const LANGUAGE_STORAGE_KEY = 'amongliars_language';

// Get saved language or default to FR
const savedLanguage = (() => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'fr';
  } catch {
    return 'fr';
  }
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        game: frGame,
        roles: frRoles,
        setup: frSetup,
        menu: frMenu,
        legal: frLegal,
      },
      en: {
        common: enCommon,
        game: enGame,
        roles: enRoles,
        setup: enSetup,
        menu: enMenu,
        legal: enLegal,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'game', 'roles', 'setup', 'menu', 'legal'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

// Save language choice to localStorage on change
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // silent fail
  }
});

export default i18n;

export const AVAILABLE_LANGUAGES = [
  { code: 'fr', label: 'Fran\u00e7ais', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'en', label: 'English', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
];
