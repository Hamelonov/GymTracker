import { FlashList } from '@shopify/flash-list';
import { Check, Plus, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { exerciseName, exerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { Chip, EmptyState, Icon, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';

export interface ExerciseListProps {
  selectedIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  header?: React.ReactNode;
  bottomPadding?: number;
  excludeIds?: Set<string>;
}

export function ExerciseAvatar({ exercise, size = 44 }: { exercise: ExerciseRow; size?: number }) {
  const c = useColors();
  const { i18n } = useTranslation();
  const name = exerciseName(exercise, i18n.language);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: exercise.isCustom ? c.accentSoft : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="h3" color={c.text}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function ExerciseList({ selectedIds, onPress, onCreate, header, bottomPadding = 0, excludeIds }: ExerciseListProps) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const all = useQuery(() => listExercises(), []);
  const usage = useQuery(() => exerciseUsage(), []);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lang = i18n.language;
    const rows = all.filter((e) => {
      if (excludeIds?.has(e.id)) return false;
      if (muscle && e.muscleGroup !== muscle && !e.secondaryMuscles.includes(muscle)) return false;
      if (!q) return true;
      return e.nameEn.toLowerCase().includes(q) || e.nameRu.toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      const ua = usage.get(a.id)?.count ?? 0;
      const ub = usage.get(b.id)?.count ?? 0;
      if (q) return exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang);
      if (ua !== ub) return ub - ua;
      return exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang);
    });
    return rows;
  }, [all, query, muscle, usage, excludeIds, i18n.language]);

  return (
    <FlashList
      data={data}
      keyExtractor={(e) => e.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomPadding + spacing.xxl }}
      ListHeaderComponent={
        <View>
          {header}
          <View style={[styles.search, { backgroundColor: c.inputBg }]}>
            <Icon icon={Search} size={18} color="faint" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('exercise.searchPlaceholder')}
              placeholderTextColor={c.textFaint}
              selectionColor={c.accent}
              style={[styles.searchInput, { color: c.text }]}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Icon icon={X} size={18} color="muted" />
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label={t('common.all')} selected={muscle == null} onPress={() => setMuscle(null)} />
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} label={t(`muscles.${m}`)} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
            ))}
          </ScrollView>
          {onCreate ? (
            <Pressable onPress={onCreate} style={[styles.create, { borderColor: c.border }]} haptic="light">
              <View style={[styles.createIcon, { backgroundColor: c.accent }]}>
                <Icon icon={Plus} size={18} color="onAccent" strokeWidth={2.5} />
              </View>
              <Text variant="bodyMedium">{t('exercise.create')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState icon={Search} title={t('common.noResults')} />}
      renderItem={({ item }) => {
        const selected = selectedIds?.has(item.id) ?? false;
        const u = usage.get(item.id);
        return (
          <Pressable onPress={() => onPress(item)} scaleTo={0.985} haptic="selection" style={[styles.row, selected ? { backgroundColor: c.accentSoft } : null]}>
            <ExerciseAvatar exercise={item} />
            <View style={styles.rowBody}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {exerciseName(item, i18n.language)}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {t(`muscles.${item.muscleGroup}`)} · {t(`equipment.${item.equipment}`)}
                {u ? ` · ${u.count}×` : ''}
              </Text>
            </View>
            {selectedIds ? (
              <View style={[styles.check, { borderColor: selected ? c.text : c.borderStrong, backgroundColor: selected ? c.text : 'transparent' }]}>
                {selected ? <Icon icon={Check} size={14} color={c.bg} strokeWidth={3} /> : null}
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  createIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  rowBody: { flex: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
