import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deferredStorage } from './kvStorage';
import { DEFAULT_PLATES_KG } from '@/domain/plates';
import { DEFAULT_SET_SEPARATOR } from '@/domain/setSeparator';
import type { DistanceUnit, MeasurementUnit, WeightUnit } from '@/domain/types';
import type { RestVibrationStrength } from '@/lib/restAlert';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'ru' | 'en';

export interface SettingsState {
  theme: ThemePreference;
  language: LanguagePreference;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  measurementUnit: MeasurementUnit;
  defaultRestSeconds: number;
  autoStartRest: boolean;
  restNotifications: boolean;
  haptics: boolean;
  /** Сила вибрации в конце отдыха; не зависит от настроек вибрации телефона. */
  restVibration: RestVibrationStrength;
  keepAwake: boolean;
  /** Символ между повторами подходов в журнале и итогах: «9/8/8». */
  setSeparator: string;
  barWeightKg: number;
  /** Имя профиля; попадает в имена файлов экспорта. */
  profileName: string;
  profileSetupCompleted: boolean;
  platesKg: number[];
  hasHydrated: boolean;
  update: (patch: Partial<SettingsState>) => void;
  markHydrated: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'system',
      weightUnit: 'kg',
      distanceUnit: 'km',
      measurementUnit: 'cm',
      defaultRestSeconds: 90,
      autoStartRest: true,
      restNotifications: true,
      haptics: true,
      restVibration: 'medium',
      keepAwake: true,
      setSeparator: DEFAULT_SET_SEPARATOR,
      barWeightKg: 20,
      profileName: '',
      profileSetupCompleted: false,
      platesKg: DEFAULT_PLATES_KG,
      hasHydrated: false,
      update: (patch) => set(patch),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => deferredStorage),
      // Сохраняем только значения, без действия `set`.
      partialize: (state) => {
        const {
          update: _setAction,
          markHydrated: _markHydrated,
          hasHydrated: _hasHydrated,
          ...persistedSettings
        } = state;
        return persistedSettings;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.profileName.trim()) state.update({ profileSetupCompleted: true });
        state?.markHydrated();
      },
    },
  ),
);
