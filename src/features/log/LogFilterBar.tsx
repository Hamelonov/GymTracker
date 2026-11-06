import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Pressable as NativePressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { LOG_PERIODS, type LogPeriod } from './logPeriod';

interface DropdownItem<Id extends string> {
  id: Id;
  name: string;
}

interface LogFilterBarProps {
  exerciseItems: DropdownItem<string>[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
  period: LogPeriod;
  onSelectPeriod: (period: LogPeriod) => void;
  /** Содержимое под фильтрами: список открывается поверх него. */
  children: React.ReactNode;
}

type OpenList = 'exercise' | 'period' | null;

const PERIOD_FIELD_WIDTH = 132;
const LIST_ROW_HEIGHT = 44;
const LIST_MAX_HEIGHT = 320;
// Сколько строк оставить над выбранной: как у <select>, она видна сразу, а не где-то внизу списка.
const ROWS_ABOVE_SELECTED = 2;

function SelectField({
  label,
  isOpen,
  onPress,
  style,
}: {
  label: string;
  isOpen: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      debounceMs={0}
      style={[
        styles.field,
        { backgroundColor: colors.surface, borderColor: isOpen ? colors.text : colors.border },
        style,
      ]}
    >
      <Text variant="bodyMedium" numberOfLines={1} style={styles.fieldLabel}>
        {label}
      </Text>
      <Icon icon={isOpen ? ChevronUp : ChevronDown} size={18} color="muted" />
    </Pressable>
  );
}

function DropdownList<Id extends string>({
  items,
  selectedId,
  onSelect,
  style,
}: {
  items: DropdownItem<Id>[];
  selectedId: string | null;
  onSelect: (id: Id) => void;
  style: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const initialOffset = Math.max(0, selectedIndex - ROWS_ABOVE_SELECTED) * LIST_ROW_HEIGHT;

  return (
    <View style={[styles.list, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, style]}>
      <ScrollView
        contentOffset={{ x: 0, y: initialOffset }}
        persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => (
          <NativePressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.listRow, pressed ? { backgroundColor: colors.surfaceAlt } : null]}
          >
            <Text variant="bodyMedium" numberOfLines={1} style={styles.fieldLabel}>
              {item.name}
            </Text>
            {item.id === selectedId ? <Icon icon={Check} size={18} /> : null}
          </NativePressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Фильтры журнала: упражнение и период в один ряд. Список открывается прямо под полем, как <select>,
 * и лежит в том же контейнере, что и таблица: снаружи родителя Android не отдаёт ему нажатия.
 */
export function LogFilterBar({
  exerciseItems,
  selectedExerciseId,
  onSelectExercise,
  period,
  onSelectPeriod,
  children,
}: LogFilterBarProps) {
  const { t: translate } = useTranslation();
  const [openList, setOpenList] = useState<OpenList>(null);
  const [barHeight, setBarHeight] = useState(0);
  const isListOpen = openList !== null;
  const periodItems = LOG_PERIODS.map((periodOption) => ({
    id: periodOption,
    name: translate(`log.periods.${periodOption}`),
  }));
  const selectedExerciseName = exerciseItems.find((item) => item.id === selectedExerciseId)?.name;
  // Список сразу под полем: нижний отступ ряда он перекрывает, чтобы не висеть в воздухе.
  const listTop = barHeight - spacing.sm + spacing.xs;

  const closeList = () => setOpenList(null);
  const toggleList = (list: Exclude<OpenList, null>) =>
    setOpenList((currentList) => (currentList === list ? null : list));

  // Кнопка «назад» закрывает список, а не уводит из приложения.
  useEffect(() => {
    if (!isListOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenList(null);
      return true;
    });
    return () => subscription.remove();
  }, [isListOpen]);

  return (
    <View style={styles.container}>
      <View style={styles.bar} onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}>
        <SelectField
          label={selectedExerciseName ?? translate('log.selectExercise')}
          isOpen={openList === 'exercise'}
          onPress={() => toggleList('exercise')}
          style={styles.exerciseField}
        />
        <SelectField
          label={translate(`log.periods.${period}`)}
          isOpen={openList === 'period'}
          onPress={() => toggleList('period')}
          style={styles.periodField}
        />
      </View>

      {/* Пока список открыт, таблица не ловит жесты: иначе холст двигался бы вместе с прокруткой списка. */}
      <View style={styles.content} pointerEvents={isListOpen ? 'none' : 'auto'}>
        {children}
      </View>

      {isListOpen ? (
        <NativePressable style={[styles.backdrop, { top: barHeight }]} onPress={closeList} />
      ) : null}
      {openList === 'exercise' ? (
        <DropdownList
          items={exerciseItems}
          selectedId={selectedExerciseId}
          onSelect={(exerciseId) => {
            onSelectExercise(exerciseId);
            closeList();
          }}
          style={[styles.exerciseList, { top: listTop }]}
        />
      ) : null}
      {openList === 'period' ? (
        <DropdownList
          items={periodItems}
          selectedId={period}
          onSelect={(selectedPeriod) => {
            onSelectPeriod(selectedPeriod);
            closeList();
          }}
          style={[styles.periodList, { top: listTop }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  content: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { flex: 1 },
  exerciseField: { flex: 1 },
  periodField: { width: PERIOD_FIELD_WIDTH },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  list: {
    position: 'absolute',
    maxHeight: LIST_MAX_HEIGHT,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 6,
  },
  exerciseList: { left: spacing.lg, right: spacing.lg },
  periodList: { right: spacing.lg, width: PERIOD_FIELD_WIDTH },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: LIST_ROW_HEIGHT,
    paddingHorizontal: spacing.md,
  },
});
