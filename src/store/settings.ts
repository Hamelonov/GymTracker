import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deferredStorage } from './kvStorage';
import { DEFAULT_PLATES_KG } from '@/domain/plates';
import type { DistanceUnit, MeasurementUnit, WeightUnit } from '@/domain/types';

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
  keepAwake: boolean;
  barWeightKg: number;
  /** Имя профиля; попадает в имена файлов экспорта. */
  profileName: string;
  platesKg: number[];
  update: (patch: Partial<SettingsState>) => void;
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
      keepAwake: true,
      barWeightKg: 20,
      profileName: '',
      platesKg: DEFAULT_PLATES_KG,
      update: (patch) => set(patch),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => deferredStorage),
      // Сохраняем только значения, без действия `set`.
      partialize: (state) => {
        const { update: _setAction, ...persistedSettings } = state;
        return persistedSettings;
      },
    },
  ),
);
