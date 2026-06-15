import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { BackendModule, ReadCallback } from 'i18next';

// Locales are loaded on demand so users only download the language they use
// (each translation.json would otherwise ship in the main bundle).
const lazyBackend: BackendModule = {
    type: 'backend',
    init: () => { },
    read: (language: string, _namespace: string, callback: ReadCallback) => {
        import(`./locales/${language}/translation.json`)
            .then((module) => callback(null, module.default))
            .catch((error) => callback(error, null));
    },
};

i18n
    .use(lazyBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        supportedLngs: ['en', 'it'],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: true,
        },
    });

// Keep <html lang> in sync with the active language so assistive tech
// pronounces content correctly (WCAG 3.1.1 / 3.1.2). The static lang="en"
// in index.html otherwise never updates when the user switches to Italian.
const syncHtmlLang = (lng: string) => {
    if (typeof document !== "undefined") {
        document.documentElement.lang = (lng || "en").split("-")[0];
    }
};
syncHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
