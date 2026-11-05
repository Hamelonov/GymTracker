import { ArrowDown, ArrowUp, Link, Trash2, Unlink } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRoutineDraft, type DraftExercise } from '@/store/routineDraft';
import { Icon, ListItem, Sheet } from '@/ui';

interface RoutineExerciseMenuSheetProps {
  visible: boolean;
  draftExercise: DraftExercise | undefined;
  /** Позиция упражнения в шаблоне, нужна для пунктов «переместить вверх / вниз». */
  exerciseIndex: number;
  exerciseCount: number;
  onClose: () => void;
  onOpenSupersetPicker: (draftExerciseId: string) => void;
}

/** Меню за кнопкой «…» упражнения в редакторе шаблона. */
export function RoutineExerciseMenuSheet({
  visible,
  draftExercise,
  exerciseIndex,
  exerciseCount,
  onClose,
  onOpenSupersetPicker,
}: RoutineExerciseMenuSheetProps) {
  const { t: translate } = useTranslation();
  const setSupersetGroup = useRoutineDraft((state) => state.setSupersetGroup);
  const moveExercise = useRoutineDraft((state) => state.moveExercise);
  const removeExercise = useRoutineDraft((state) => state.removeExercise);

  const isInSuperset = draftExercise?.supersetGroup != null;

  return (
    <Sheet visible={visible} onClose={onClose} unpadded>
      {draftExercise ? (
        <>
          <ListItem
            title={
              isInSuperset ? translate('workout.removeFromSuperset') : translate('workout.createSuperset')
            }
            left={<Icon icon={isInSuperset ? Unlink : Link} />}
            onPress={() => {
              if (isInSuperset) {
                setSupersetGroup([draftExercise.id], null);
                onClose();
              } else onOpenSupersetPicker(draftExercise.id);
            }}
          />
          {exerciseIndex > 0 ? (
            <ListItem
              title={`${translate('workout.reorder')} ↑`}
              left={<Icon icon={ArrowUp} />}
              onPress={() => {
                moveExercise(exerciseIndex, exerciseIndex - 1);
                onClose();
              }}
            />
          ) : null}
          {exerciseIndex < exerciseCount - 1 ? (
            <ListItem
              title={`${translate('workout.reorder')} ↓`}
              left={<Icon icon={ArrowDown} />}
              onPress={() => {
                moveExercise(exerciseIndex, exerciseIndex + 1);
                onClose();
              }}
            />
          ) : null}
          <ListItem
            title={translate('workout.removeExercise')}
            tone="danger"
            left={<Icon icon={Trash2} color="danger" />}
            onPress={() => {
              removeExercise(draftExercise.id);
              onClose();
            }}
          />
        </>
      ) : null}
    </Sheet>
  );
}
