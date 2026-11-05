import { SlidersHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Equipment, MuscleGroup } from '@/domain/types';
import { SettingSwitchRow } from '@/features/settings/SettingSwitchRow';
import { Button, Chip, Icon, Pressable, Sheet, Text, radius, spacing, useColors } from '@/ui';
import {
  countActiveLogFilters,
  DEFAULT_LOG_FILTERS,
  LOG_PERIODS,
  LOG_WEIGHT_FILTERS,
  type LogFilters,
} from './logFilters';

// Доля экрана, а не число: на маленьком телефоне шторка не уедет за край, на большом всё видно без прокрутки.
const SHEET_HEIGHT_SHARE = 0.75;

interface LogFilterButtonProps {
  filters: LogFilters;
  /** Только те мышцы и оборудование, что есть в журнале: остальные чипы ничего бы не нашли. */
  muscleGroups: MuscleGroup[];
  equipmentOptions: Equipment[];
  onChange: (filters: LogFilters) => void;
}

function toggleInList<Value>(values: Value[], value: Value): Value[] {
  if (values.includes(value)) return values.filter((currentValue) => currentValue !== value);
  return [...values, value];
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="muted">
        {title.toUpperCase()}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** Кнопка рядом с выбором упражнения: показывает число включённых фильтров, по нажатию — шторка. */
export function LogFilterButton({ filters, muscleGroups, equipmentOptions, onChange }: LogFilterButtonProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = countActiveLogFilters(filters);
  const hasActiveFilters = activeFilterCount > 0;
  const updateFilters = (patch: Partial<LogFilters>) => onChange({ ...filters, ...patch });

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        haptic="selection"
        accessibilityLabel={translate('log.filters')}
        style={[
          styles.button,
          hasActiveFilters
            ? { backgroundColor: colors.accent, borderColor: colors.accent }
            : { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon icon={SlidersHorizontal} size={20} color={hasActiveFilters ? 'onAccent' : 'text'} />
        {hasActiveFilters ? (
          <Text variant="bodyMedium" color="onAccent" tabular>
            {activeFilterCount}
          </Text>
        ) : null}
      </Pressable>

      <Sheet visible={isOpen} onClose={() => setIsOpen(false)} title={translate('log.filters')} unpadded>
        <ScrollView
          style={{ maxHeight: windowHeight * SHEET_HEIGHT_SHARE }}
          contentContainerStyle={styles.sheetContentInner}
        >
          <FilterSection title={translate('log.filterPeriod')}>
            {LOG_PERIODS.map((period) => (
              <Chip
                small
                key={period}
                label={translate(`log.periods.${period}`)}
                selected={filters.period === period}
                onPress={() => updateFilters({ period })}
              />
            ))}
          </FilterSection>

          <FilterSection title={translate('log.filterMuscles')}>
            {muscleGroups.map((muscleGroup) => (
              <Chip
                small
                key={muscleGroup}
                label={translate(`muscles.${muscleGroup}`)}
                selected={filters.muscleGroups.includes(muscleGroup)}
                onPress={() =>
                  updateFilters({ muscleGroups: toggleInList(filters.muscleGroups, muscleGroup) })
                }
              />
            ))}
          </FilterSection>

          <FilterSection title={translate('log.filterEquipment')}>
            {equipmentOptions.map((equipment) => (
              <Chip
                small
                key={equipment}
                label={translate(`equipment.${equipment}`)}
                selected={filters.equipment.includes(equipment)}
                onPress={() => updateFilters({ equipment: toggleInList(filters.equipment, equipment) })}
              />
            ))}
          </FilterSection>

          <FilterSection title={translate('log.filterWeight')}>
            {LOG_WEIGHT_FILTERS.map((weight) => (
              <Chip
                small
                key={weight}
                label={translate(`log.weightFilters.${weight}`)}
                selected={filters.weight === weight}
                onPress={() => updateFilters({ weight })}
              />
            ))}
          </FilterSection>

          <SettingSwitchRow
            title={translate('log.onlyWithNotes')}
            value={filters.onlyWithNotes}
            onChange={(onlyWithNotes) => updateFilters({ onlyWithNotes })}
          />
          <SettingSwitchRow
            title={translate('log.hideWarmups')}
            value={filters.hideWarmups}
            onChange={(hideWarmups) => updateFilters({ hideWarmups })}
          />

          <View style={styles.resetButton}>
            <Button
              title={translate('log.resetFilters')}
              variant="secondary"
              fullWidth
              disabled={!hasActiveFilters}
              onPress={() => onChange(DEFAULT_LOG_FILTERS)}
            />
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minWidth: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetContentInner: { paddingBottom: spacing.lg },
  section: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resetButton: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
