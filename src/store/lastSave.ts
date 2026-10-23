import { create } from 'zustand';
import type { SaveResult } from '@/db/repo/workouts';

interface LastSaveState {
  result: SaveResult | null;
  set: (r: SaveResult | null) => void;
}

export const useLastSave = create<LastSaveState>((set) => ({
  result: null,
  set: (result) => set({ result }),
}));
