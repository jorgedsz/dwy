import en from './en.json';
import es from './es.json';

const translations = { en, es };

export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

export function t(key, lang = 'en', vars = {}) {
  const keys = key.split('.');
  let val = translations[lang] || translations.en;
  for (const k of keys) {
    val = val?.[k];
    if (val === undefined) return key;
  }
  if (typeof val !== 'string') return key;
  return val.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}
