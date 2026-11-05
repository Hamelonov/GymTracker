import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SetType } from '@/domain/types';
import { Icon, ListItem, Sheet } from '@/ui';
import { SetTypeMark } from '../SetTypeMark';

const SET_TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

interface SetTypePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSetTypeSelect: (type: SetType) => void;
  onDeleteSetPress: () => void;
}

/** Открывается по номеру подхода: изменить тип подхода или удалить его. */
export function SetTypePickerSheet({
  visible,
  onClose,
  onSetTypeSelect,
  onDeleteSetPress,
}: SetTypePickerSheetProps) {
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.setType')} unpadded>
      {SET_TYPES.map((type) => (
        <ListItem
          key={type}
          title={translate(`workout.setTypes.${type}`)}
          left={
            <SetTypeMark
              type={type}
              label={type === 'normal' ? '1' : translate(`workout.setTypeShort.${type}`)}
            />
          }
          onPress={() => onSetTypeSelect(type)}
        />
      ))}
      <ListItem
        title={translate('workout.deleteSet')}
        tone="danger"
        left={<Icon icon={Trash2} color="danger" />}
        onPress={onDeleteSetPress}
      />
    </Sheet>
  );
}
