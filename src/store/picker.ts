import { create } from 'zustand';

/** Канал передачи результата из модалки выбора упражнения тому, кто её открыл. */
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
    // Прочитать результат может только экран, открывший выбор (тот же токен).
    if (get().token !== token) return null;
    const pickedExerciseIds = get().exerciseIds;
    set({ token: null, exerciseIds: [] });
    return pickedExerciseIds;
  },
}));
