import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { SetType } from '@/domain/types';
import { Icon, ListItem, Sheet, spacing, useColors } from '@/ui';

const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

interface SetTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectSetType: (setType: SetType) => void;
  onDeleteSet: () => void;
}

/** Открывается по номеру подхода в редакторе шаблона: изменить тип подхода или удалить его. */
export function SetTypeSheet({ visible, onClose, onSelectSetType, onDeleteSet }: SetTypeSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.setType')} unpadded>
      <View style={{ paddingHorizontal: spacing.sm }}>
        {SET_TYPES.map((setType) => (
          <ListItem
            key={setType}
            title={translate(`workout.setTypes.${setType}`)}
            onPress={() => onSelectSetType(setType)}
          />
        ))}
        <ListItem
          title={translate('workout.deleteSet')}
          titleColor={colors.danger}
          left={<Icon icon={Trash2} color="danger" />}
          onPress={onDeleteSet}
        />
      </View>
    </Sheet>
  );
}
