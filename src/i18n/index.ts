import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import ru from './ru';
import { setUnitLabels } from '@/domain/units';
import type { LanguagePref } from '@/store/settings';

export function resolveLanguage(pref: LanguagePref): 'ru' | 'en' {
  if (pref !== 'system') return pref;
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'ru' ? 'ru' : 'en';
}

const UNIT_LABELS = {
  en: { kg: 'kg', lb: 'lb', km: 'km', mi: 'mi', cm: 'cm', in: 'in', h: 'h', m: 'm', s: 's' },
  ru: { kg: 'кг', lb: 'фунт', km: 'км', mi: 'ми', cm: 'см', in: 'дюйм', h: 'ч', m: 'м', s: 'с' },
} as const;

export function initI18n(pref: LanguagePref) {
  if (i18n.isInitialized) return i18n;
  setUnitLabels(UNIT_LABELS[resolveLanguage(pref)]);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: resolveLanguage(pref),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
  return i18n;
}

export function setLanguage(pref: LanguagePref) {
  setUnitLabels(UNIT_LABELS[resolveLanguage(pref)]);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.changeLanguage(resolveLanguage(pref));
}

export default i18n;
