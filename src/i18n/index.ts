import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import ru from './ru';
import { setUnitLabels } from '@/domain/units';
import type { LanguagePreference } from '@/store/settings';

export function resolveLanguage(preference: LanguagePreference): 'ru' | 'en' {
  if (preference !== 'system') return preference;
  const deviceLanguageCode = getLocales()[0]?.languageCode ?? 'en';
  return deviceLanguageCode === 'ru' ? 'ru' : 'en';
}

const UNIT_LABELS = {
  en: { kg: 'kg', lb: 'lb', km: 'km', mi: 'mi', cm: 'cm', in: 'in', h: 'h', m: 'm', s: 's' },
  ru: { kg: 'кг', lb: 'фунт', km: 'км', mi: 'ми', cm: 'см', in: 'дюйм', h: 'ч', m: 'м', s: 'с' },
} as const;

export function initI18n(preference: LanguagePreference) {
  if (i18n.isInitialized) return i18n;
  setUnitLabels(UNIT_LABELS[resolveLanguage(preference)]);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: resolveLanguage(preference),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    // Перерисовываем при замене пакетов ресурсов (см. dev-обновление ниже).
    react: { bindI18nStore: 'added' },
  });
  return i18n;
}

// Fast Refresh перезапускает этот модуль при изменении файла словаря, но `i18next`
// инициализируется только один раз. Передаём свежие словари, чтобы новые строки появились
// сразу, а не в виде сырых ключей.
if (__DEV__ && i18n.isInitialized) {
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('ru', 'translation', ru, true, true);
}

export function setLanguage(preference: LanguagePreference) {
  setUnitLabels(UNIT_LABELS[resolveLanguage(preference)]);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.changeLanguage(resolveLanguage(preference));
}

export default i18n;
