import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Sheet, spacing } from '@/ui';

interface RenameWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  nameDraft: string;
  onNameDraftChange: (name: string) => void;
  onSave: () => void;
}

export function RenameWorkoutSheet({
  visible,
  onClose,
  nameDraft,
  onNameDraftChange,
  onSave,
}: RenameWorkoutSheetProps) {
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.nameLabel')}>
      <Input
        value={nameDraft}
        onChangeText={onNameDraftChange}
        autoFocus
        placeholder={translate('workout.defaultName')}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <Button
        title={translate('common.save')}
        size="lg"
        fullWidth
        onPress={onSave}
        style={{ marginTop: spacing.lg }}
      />
    </Sheet>
  );
}
