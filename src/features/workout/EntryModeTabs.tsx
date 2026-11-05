import { LayoutList, PenLine } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { EntryMode } from '@/store/activeWorkout';
import { Segmented } from '@/ui';

interface EntryModeTabsProps {
  value: EntryMode;
  onChange: (mode: EntryMode) => void;
}

/** Значки «Стандарт» / «Ручка» справа в полосе статистики тренировки. */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
  const { t: translate } = useTranslation();
  return (
    <Segmented<EntryMode>
      compact
      value={value}
      onChange={onChange}
      options={[
        { value: 'standard', label: translate('workout.modeStandard'), icon: LayoutList },
        { value: 'pen', label: translate('workout.modePen'), icon: PenLine },
      ]}
    />
  );
}
