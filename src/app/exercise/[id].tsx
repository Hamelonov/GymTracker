import { useLocalSearchParams } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { getExerciseHistory, exerciseName, getExercise, getRecordDetails } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { recordTypesForExercise } from '@/domain/records';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { ExerciseAboutTab } from '@/features/exercises/ExerciseAboutTab';
import { ExerciseChartsTab, type ChartMetric } from '@/features/exercises/ExerciseChartsTab';
import { ExerciseHistoryTab } from '@/features/exercises/ExerciseHistoryTab';
import { ExerciseMenuSheet } from '@/features/exercises/ExerciseMenuSheet';
import { ExerciseRecordsTab } from '@/features/exercises/ExerciseRecordsTab';
import { useSettings } from '@/store/settings';
import { IconButton, Screen, Segmented, spacing, useColors } from '@/ui';

type ExerciseTab = 'about' | 'history' | 'charts' | 'records';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const settings = useSettings();
  const [activeTab, setActiveTab] = useState<ExerciseTab>('about');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const exercise = useQuery(() => (id ? getExercise(id) : undefined), [id]);
  const history = useQuery(() => (id ? getExerciseHistory(id) : []), [id]);
  const records = useQuery(() => (id ? getRecordDetails(id) : []), [id]);
  const availableMetrics = useMemo<ChartMetric[]>(
    () => (exercise ? recordTypesForExercise(exercise.type) : []),
    [exercise],
  );
  // Kept here (not in the charts tab) so the chosen metric survives switching tabs.
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric | null>(null);
  const activeMetric =
    selectedMetric && availableMetrics.includes(selectedMetric)
      ? selectedMetric
      : (availableMetrics[0] ?? 'weight');
  const units = useMemo(
    () => ({ weight: settings.weightUnit, distance: settings.distanceUnit }),
    [settings.weightUnit, settings.distanceUnit],
  );

  if (!exercise) return <Screen header={{ backButton: true }} />;
  const displayName = exerciseName(exercise, i18n.language);

  return (
    <Screen
      header={{
        backButton: true,
        title: displayName,
        subtitle: `${translate(`muscles.${exercise.muscleGroup}`)} · ${translate(`equipment.${exercise.equipment}`)}`,
        right: (
          <IconButton
            icon={Ellipsis}
            variant="filled"
            onPress={() => setIsMenuOpen(true)}
            haptic="selection"
          />
        ),
      }}
      stickyHeaderIndices={[0]}
    >
      <View style={{ backgroundColor: colors.background, paddingBottom: spacing.md }}>
        <Segmented
          options={[
            { value: 'about', label: translate('exercise.about') },
            { value: 'history', label: translate('exercise.history') },
            { value: 'charts', label: translate('exercise.charts') },
            { value: 'records', label: translate('exercise.records') },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {activeTab === 'about' ? (
        <ExerciseAboutTab exercise={exercise} timesPerformed={history.length} />
      ) : null}

      {activeTab === 'history' ? (
        <ExerciseHistoryTab
          history={history}
          fields={getSetFieldsForExerciseType(exercise.type)}
          units={units}
        />
      ) : null}

      {activeTab === 'charts' ? (
        <ExerciseChartsTab
          history={history}
          availableMetrics={availableMetrics}
          activeMetric={activeMetric}
          onSelectMetric={setSelectedMetric}
          units={units}
        />
      ) : null}

      {activeTab === 'records' ? <ExerciseRecordsTab records={records} units={units} /> : null}

      <ExerciseMenuSheet
        visible={isMenuOpen}
        exercise={exercise}
        exerciseDisplayName={displayName}
        onClose={() => setIsMenuOpen(false)}
      />
    </Screen>
  );
}
