import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Link,
  Replace,
  SlidersHorizontal,
  Timer,
  Trash2,
  Unlink,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { Icon, ListItem, Sheet } from '@/ui';
import { exerciseDisplayName } from '../exerciseDisplayName';

interface ExerciseMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Упражнение, для которого открыто меню; без него лист остаётся пустым. */
  workoutExercise: ActiveExercise | undefined;
  exerciseDetails: ExerciseRow | undefined;
  restSeconds: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDescriptionPress: () => void;
  onExtraFieldsPress: () => void;
  onRestTimerPress: () => void;
  onReplacePress: () => void;
  onSupersetPress: () => void;
  onMoveUpPress: () => void;
  onMoveDownPress: () => void;
  onRemovePress: () => void;
}

/** Меню «…» карточки упражнения: описание, дополнительные поля, таймер отдыха, замена, суперсет, порядок и удаление. */
export function ExerciseMenuSheet({
  visible,
  onClose,
  workoutExercise,
  exerciseDetails,
  restSeconds,
  canMoveUp,
  canMoveDown,
  onDescriptionPress,
  onExtraFieldsPress,
  onRestTimerPress,
  onReplacePress,
  onSupersetPress,
  onMoveUpPress,
  onMoveDownPress,
  onRemovePress,
}: ExerciseMenuSheetProps) {
  const { t: translate, i18n } = useTranslation();
  const title = workoutExercise ? exerciseDisplayName(exerciseDetails, i18n.language) : undefined;
  const isInSuperset = workoutExercise?.supersetGroup != null;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} unpadded>
      {workoutExercise ? (
        <>
          <ListItem
            title={translate('workout.description')}
            left={<Icon icon={BookOpen} />}
            onPress={onDescriptionPress}
          />
          <ListItem
            title={translate('workout.extraFieldsTitle')}
            left={<Icon icon={SlidersHorizontal} />}
            onPress={onExtraFieldsPress}
          />
          <ListItem
            title={translate('workout.restTimer')}
            subtitle={restSeconds > 0 ? formatDuration(restSeconds) : translate('workout.restOff')}
            left={<Icon icon={Timer} />}
            onPress={onRestTimerPress}
          />
          <ListItem
            title={translate('workout.replaceExercise')}
            left={<Icon icon={Replace} />}
            onPress={onReplacePress}
          />
          <ListItem
            title={
              isInSuperset ? translate('workout.removeFromSuperset') : translate('workout.createSuperset')
            }
            left={<Icon icon={isInSuperset ? Unlink : Link} />}
            onPress={onSupersetPress}
          />
          {canMoveUp ? (
            <ListItem
              title={`${translate('workout.reorder')} ↑`}
              left={<Icon icon={ArrowUp} />}
              onPress={onMoveUpPress}
            />
          ) : null}
          {canMoveDown ? (
            <ListItem
              title={`${translate('workout.reorder')} ↓`}
              left={<Icon icon={ArrowDown} />}
              onPress={onMoveDownPress}
            />
          ) : null}
          <ListItem
            title={translate('workout.removeExercise')}
            tone="danger"
            left={<Icon icon={Trash2} color="danger" />}
            onPress={onRemovePress}
          />
        </>
      ) : null}
    </Sheet>
  );
}
