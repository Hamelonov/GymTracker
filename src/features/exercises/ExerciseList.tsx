import { FlashList } from '@shopify/flash-list';
import { Check, Plus, Search, X } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable as RNPressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { exerciseName, exerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { Chip, EmptyState, Icon, Pressable, Text, fonts, radius, spacing, useColors, type ThemeColors } from '@/ui';

export interface ExerciseListProps {
  selectedIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  header?: React.ReactNode;
  bottomPadding?: number;
  excludeIds?: Set<string>;
}

interface Item {
  exercise: ExerciseRow;
  name: string;
  subtitle: string;
  initial: string;
}

const collators = new Map<string, Intl.Collator>();
function collator(lang: string): Intl.Collator {
  let c = collators.get(lang);
  if (!c) {
    c = new Intl.Collator(lang, { sensitivity: 'base' });
    collators.set(lang, c);
  }
  return c;
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

/** One row. Plain RN Pressable: the list renders many of these and must stay cheap. */
const Row = memo(function Row({
  item,
  selected,
  selectable,
  colors,
  onPress,
}: {
  item: Item;
  selected: boolean;
  selectable: boolean;
  colors: ThemeColors;
  onPress: (e: ExerciseRow) => void;
}) {
  const c = colors;
  return (
    <RNPressable onPress={() => onPress(item.exercise)} style={({ pressed }) => [styles.row, selected ? { backgroundColor: c.accentSoft } : null, pressed ? { opacity: 0.7 } : null]}>
      <View style={[styles.avatar, { backgroundColor: item.exercise.isCustom ? c.accentSoft : c.surfaceAlt }]}>
        <Text variant="h3">{item.initial}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {selectable ? (
        <View style={[styles.check, { borderColor: selected ? c.text : c.borderStrong, backgroundColor: selected ? c.text : 'transparent' }]}>
          {selected ? <Icon icon={Check} size={14} color={c.bg} strokeWidth={3} /> : null}
        </View>
      ) : null}
    </RNPressable>
  );
});

export function ExerciseList({ selectedIds, onPress, onCreate, header, bottomPadding = 0, excludeIds }: ExerciseListProps) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const all = useQuery(() => listExercises(), []);
  const usage = useQuery(() => exerciseUsage(), []);
  const lang = i18n.language;

  // Precompute display strings and the default order once per data/language change.
  const items = useMemo<Item[]>(() => {
    const cmp = collator(lang);
    const list = all.map((e) => {
      const name = exerciseName(e, lang);
      const u = usage.get(e.id);
      return {
        exercise: e,
        name,
        initial: name.slice(0, 1).toUpperCase(),
        subtitle: `${t(`muscles.${e.muscleGroup}`)} · ${t(`equipment.${e.equipment}`)}${u ? ` · ${u.count}×` : ''}`,
      };
    });
    list.sort((a, b) => {
      const ua = usage.get(a.exercise.id)?.count ?? 0;
      const ub = usage.get(b.exercise.id)?.count ?? 0;
      if (ua !== ub) return ub - ua;
      return cmp.compare(a.name, b.name);
    });
    return list;
  }, [all, usage, lang, t]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((it) => {
      const e = it.exercise;
      if (excludeIds?.has(e.id)) return false;
      if (muscle && e.muscleGroup !== muscle && !e.secondaryMuscles.includes(muscle)) return false;
      if (!q) return true;
      return e.nameEn.toLowerCase().includes(q) || e.nameRu.toLowerCase().includes(q);
    });
    if (q) {
      const cmp = collator(lang);
      filtered.sort((a, b) => cmp.compare(a.name, b.name));
    }
    return filtered;
  }, [items, query, muscle, excludeIds, lang]);

  const selectable = selectedIds != null;
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <Row item={item} selected={selectedIds?.has(item.exercise.id) ?? false} selectable={selectable} colors={c} onPress={onPress} />,
    [selectedIds, selectable, c, onPress],
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(it) => it.exercise.id}
      keyboardShouldPersistTaps="handled"
      extraData={selectedIds}
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
              <RNPressable onPress={() => setQuery('')} hitSlop={10}>
                <Icon icon={X} size={18} color="muted" />
              </RNPressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label={t('common.all')} selected={muscle == null} onPress={() => setMuscle(null)} />
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} label={t(`muscles.${m}`)} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
            ))}
          </ScrollView>
          {onCreate ? (
            <Pressable onPress={onCreate} style={styles.create} haptic="light">
              <View style={[styles.createIcon, { backgroundColor: c.accent }]}>
                <Icon icon={Plus} size={18} color="onAccent" strokeWidth={2.5} />
              </View>
              <Text variant="bodyMedium">{t('exercise.create')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState icon={Search} title={t('common.noResults')} />}
      renderItem={renderItem}
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
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
