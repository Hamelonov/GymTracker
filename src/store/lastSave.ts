import { create } from 'zustand';
import type { SaveResult } from '@/db/repo/workouts';

interface LastSaveState {
  result: SaveResult | null;
  setResult: (result: SaveResult | null) => void;
}

export const useLastSave = create<LastSaveState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
}));
