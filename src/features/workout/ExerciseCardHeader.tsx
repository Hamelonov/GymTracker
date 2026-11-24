import type { LucideIcon } from 'lucide-react-native';
import { CircleQuestionMark, EllipsisVertical, FilePlus, Link, Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';

interface ExerciseCardHeaderProps {
  name: string;
  supersetGroup: number | null;
  supersetColor: string | null | undefined;
  hasNote: boolean;
  /** Отдых после подхода у этого упражнения, секунды; 0 — таймер выключен. */
  restSeconds: number;
  /** В режиме «только чтение» остаётся одно название: кнопок и чипов нет. */
  readOnly?: boolean;
  onDescriptionPress: () => void;
  onMenuPress: () => void;
  onRestPress: () => void;
  onNotePress: () => void;
}

/**
 * Верх карточки упражнения: название со справкой и меню «⋮» справа,
 * а под ним чипы «Отдых» и «Заметка».
 */
export function ExerciseCardHeader({
  name,
  supersetGroup,
  supersetColor,
  hasNote,
  restSeconds,
  readOnly,
  onDescriptionPress,
  onMenuPress,
  onRestPress,
  onNotePress,
}: ExerciseCardHeaderProps) {
  const { t: translate } = useTranslation();
  const restTimeText = restSeconds > 0 ? formatDuration(restSeconds) : translate('workout.restOff');

  return (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleColumn}>
          <Text variant="h3" numberOfLines={2}>
            {name}
          </Text>
          {supersetGroup != null ? (
            <View style={styles.supersetTag}>
              <Icon icon={Link} size={12} color={supersetColor ?? 'muted'} />
              <Text variant="label" color={supersetColor ?? 'muted'}>
                {translate('workout.superset').toUpperCase()} {supersetGroup}
              </Text>
            </View>
          ) : null}
        </View>
        {!readOnly ? (
          <View style={styles.titleButtons}>
            {/* Справка открывает постоянное описание упражнения, а не заметку за сегодня. */}
            <TitleButton icon={CircleQuestionMark} onPress={onDescriptionPress} />
            <TitleButton icon={EllipsisVertical} onPress={onMenuPress} />
          </View>
        ) : null}
      </View>
      {!readOnly ? (
        <View style={styles.chipRow}>
          <ActionChip
            icon={Timer}
            label={translate('workout.restChip', { time: restTimeText })}
            onPress={onRestPress}
          />
          <ActionChip
            icon={FilePlus}
            label={translate('workout.noteChip')}
            isHighlighted={hasNote}
            onPress={onNotePress}
          />
        </View>
      ) : null}
    </View>
  );
}

function TitleButton({ icon, onPress }: { icon: LucideIcon; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} haptic="selection" hitSlop={6} style={styles.titleButton}>
      <Icon icon={icon} size={22} />
    </Pressable>
  );
}

/** Чип-кнопка под названием; заливается акцентом, когда за ним уже что-то записано (заметка). */
function ActionChip({
  icon,
  label,
  isHighlighted,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  isHighlighted?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const contentColor = isHighlighted ? 'onAccent' : 'text';
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={[styles.chip, { backgroundColor: isHighlighted ? colors.accent : colors.surfaceAlt }]}
    >
      <Icon icon={icon} size={18} color={contentColor} />
      <Text variant="bodyMedium" color={contentColor} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.sm },
  titleColumn: { flex: 1 },
  supersetTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  titleButtons: { flexDirection: 'row', alignItems: 'center' },
  titleButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
