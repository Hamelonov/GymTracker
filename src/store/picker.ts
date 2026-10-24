import { create } from 'zustand';

/** Hand-off channel for the exercise picker modal → whoever opened it. */
interface PickerResultState {
  token: string | null;
  exerciseIds: string[];
  publish: (token: string, exerciseIds: string[]) => void;
  consume: (token: string) => string[] | null;
}

export const usePickerResult = create<PickerResultState>((set, get) => ({
  token: null,
  exerciseIds: [],
  publish: (token, exerciseIds) => set({ token, exerciseIds }),
  consume: (token) => {
    // Only the screen that opened the picker (same token) may read the result.
    if (get().token !== token) return null;
    const pickedExerciseIds = get().exerciseIds;
    set({ token: null, exerciseIds: [] });
    return pickedExerciseIds;
  },
}));
