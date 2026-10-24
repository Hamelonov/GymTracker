import { useTranslation } from 'react-i18next';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { serializeWorkout } from '@/domain/pen/serializeWorkout';
import type { ActiveWorkout, DistanceUnit, WeightUnit } from '@/domain/types';
import { useActiveWorkout, type EntryMode } from '@/store/activeWorkout';
import { confirm, toast } from '@/ui';
import { applyPenText } from './applyPenText';
import type { PenTextState } from './usePenText';

interface UseEntryModeOptions {
  workout: ActiveWorkout | null;
  penText: string;
  penState: PenTextState;
  units: { weight: WeightUnit; distance: DistanceUnit };
  exercisesById: Map<string, ExerciseRow>;
}

/** Переключение «Стандарт» ↔ «Ручка»: сериализация карточек в текст и применение текста к карточкам. */
export function useEntryMode({ workout, penText, penState, units, exercisesById }: UseEntryModeOptions) {
  const { t: translate, i18n } = useTranslation();
  const getWorkoutStore = useActiveWorkout.getState;

  /** Текст «Ручки» → карточки. false, если в тексте есть ошибки или пользователь передумал. */
  const applyPenNow = async (): Promise<boolean> => {
    if (!workout) return false;
    if (penState.errorCount > 0) {
      toast(translate('workout.penFixErrors'));
      return false;
    }
    if (penText.trim().length === 0 && workout.exercises.length > 0) {
      const isConfirmed = await confirm({
        title: translate('workout.penClearConfirm'),
        confirmLabel: translate('common.delete'),
        destructive: true,
      });
      if (!isConfirmed) return false;
    }
    const result = applyPenText({
      text: penText,
      workout,
      candidates: penState.candidates,
      typeByExerciseId: penState.typeByExerciseId,
      weightUnit: units.weight,
      distanceUnit: units.distance,
      now: Date.now(),
    });
    if (!result.ok) {
      toast(translate('workout.penFixErrors'));
      return false;
    }
    getWorkoutStore().applyPenResult(result.exercises);
    return true;
  };

  const switchEntryMode = async (mode: EntryMode) => {
    if (!workout || mode === getWorkoutStore().entryMode) return;
    if (mode === 'pen') {
      const rows = [...exercisesById.values()];
      const text = serializeWorkout(workout, {
        weightUnit: units.weight,
        distanceUnit: units.distance,
        language: i18n.language,
        exerciseNameById: new Map(rows.map((row) => [row.id, exerciseName(row, i18n.language)])),
        exerciseTypeById: new Map(rows.map((row) => [row.id, row.type])),
      });
      getWorkoutStore().switchToPen(text);
      return;
    }
    await applyPenNow();
  };

  return { applyPenNow, switchEntryMode };
}
