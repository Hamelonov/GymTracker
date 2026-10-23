import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PLATES_KG } from '@/domain/plates';
import type { DistanceUnit, MeasurementUnit, WeightUnit } from '@/domain/types';

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | 'ru' | 'en';

export interface SettingsState {
  theme: ThemePref;
  language: LanguagePref;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  measurementUnit: MeasurementUnit;
  defaultRestSeconds: number;
  autoStartRest: boolean;
  restNotifications: boolean;
  haptics: boolean;
  keepAwake: boolean;
  showRpe: boolean;
  barWeightKg: number;
  platesKg: number[];
  set: (patch: Partial<SettingsState>) => void;
}

const kvStorage = {
  getItem: (name: string) => Storage.getItemSync(name),
  setItem: (name: string, value: string) => Storage.setItemSync(name, value),
  removeItem: (name: string) => {
    Storage.removeItemSync(name);
  },
};

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
      showRpe: false,
      barWeightKg: 20,
      platesKg: DEFAULT_PLATES_KG,
      set: (patch) => set(patch),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => {
        const { set: _set, ...rest } = s;
        return rest;
      },
    },
  ),
);
