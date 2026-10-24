import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import type { QuickEntryCommit } from '@/store/activeWorkoutQuickEntry';
import { Button, Input, Sheet, spacing } from '@/ui';
import { commitQuickEntry } from './commitQuickEntry';
import { QuickEntryPreview } from './QuickEntryPreview';
import { useQuickEntry, type PreviewLine } from './useQuickEntry';

interface QuickEntryFormProps {
  /** Текст поля живёт на экране тренировки и обнуляется при каждом открытии. */
  text: string;
  onTextChange: (text: string) => void;
  exerciseIdsInWorkout: string[];
  onSubmit: (commits: QuickEntryCommit[], previewLines: PreviewLine[]) => void;
}

interface QuickEntrySheetProps extends QuickEntryFormProps {
  visible: boolean;
  onClose: () => void;
}

/** Шторка быстрой записи: поле для строк вроде «Присед 70кг х 7/6/5» и живой предпросмотр под ним. */
export function QuickEntrySheet({ visible, onClose, ...formProps }: QuickEntrySheetProps) {
  const { t: translate } = useTranslation();
  // Форма монтируется только пока шторка открыта: иначе её запросы к базе выполнялись бы при каждом
  // фокусе экрана тренировки. Шторка сама хранит последнее содержимое на время анимации закрытия.
  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.quickEntryTitle')}>
      {visible ? <QuickEntryForm {...formProps} /> : null}
    </Sheet>
  );
}

function QuickEntryForm({ text, onTextChange, exerciseIdsInWorkout, onSubmit }: QuickEntryFormProps) {
  const { t: translate } = useTranslation();
  const { previewLines, resolvedLines, canSubmit } = useQuickEntry(text, exerciseIdsInWorkout);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(commitQuickEntry(resolvedLines), previewLines);
  };

  return (
    <>
      <Input
        value={text}
        onChangeText={onTextChange}
        autoFocus
        multiline
        autoCapitalize="sentences"
        autoCorrect={false}
        blurOnSubmit={false}
        placeholder={translate('workout.quickEntryPlaceholder')}
        hint={translate('workout.quickEntryHint')}
        style={styles.input}
      />
      <QuickEntryPreview lines={previewLines} />
      <Button
        title={translate('common.add')}
        size="lg"
        fullWidth
        disabled={!canSubmit}
        onPress={submit}
        style={styles.addButton}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 72 },
  addButton: { marginTop: spacing.lg },
});
