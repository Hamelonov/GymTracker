import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Timer,
  Unlink,
  X,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise } from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { Icon, ListItem, Sheet, spacing, useColors } from '@/ui';
import { exerciseDisplayName } from '../exerciseDisplayName';

/** Крупные значки пунктов: «обновить» для замены, «+» для суперсета, красный крест для удаления. */
const MENU_ICON_SIZE = 26;

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
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const title = workoutExercise ? exerciseDisplayName(exerciseDetails, i18n.language) : undefined;
  const isInSuperset = workoutExercise?.supersetGroup != null;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} unpadded>
      {workoutExercise ? (
        <View style={styles.menuList}>
          <ListItem
            title={translate('workout.description')}
            left={<Icon icon={BookOpen} size={MENU_ICON_SIZE} />}
            onPress={onDescriptionPress}
          />
          <ListItem
            title={translate('workout.extraFieldsTitle')}
            left={<Icon icon={SlidersHorizontal} size={MENU_ICON_SIZE} />}
            onPress={onExtraFieldsPress}
          />
          <ListItem
            title={translate('workout.restTimer')}
            subtitle={restSeconds > 0 ? formatDuration(restSeconds) : translate('workout.restOff')}
            left={<Icon icon={Timer} size={MENU_ICON_SIZE} />}
            onPress={onRestTimerPress}
          />
          <ListItem
            title={translate('workout.replaceExercise')}
            left={<Icon icon={RefreshCw} size={MENU_ICON_SIZE} />}
            onPress={onReplacePress}
          />
          <ListItem
            title={
              isInSuperset ? translate('workout.removeFromSuperset') : translate('workout.createSuperset')
            }
            left={<Icon icon={isInSuperset ? Unlink : Plus} size={MENU_ICON_SIZE} />}
            onPress={onSupersetPress}
          />
          {canMoveUp ? (
            <ListItem
              title={`${translate('workout.reorder')} ↑`}
              left={<Icon icon={ArrowUp} size={MENU_ICON_SIZE} />}
              onPress={onMoveUpPress}
            />
          ) : null}
          {canMoveDown ? (
            <ListItem
              title={`${translate('workout.reorder')} ↓`}
              left={<Icon icon={ArrowDown} size={MENU_ICON_SIZE} />}
              onPress={onMoveDownPress}
            />
          ) : null}
          <ListItem
            title={translate('workout.removeExercise')}
            titleColor={colors.danger}
            left={<Icon icon={X} size={MENU_ICON_SIZE} color="danger" />}
            onPress={onRemovePress}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  menuList: { paddingHorizontal: spacing.sm },
});
