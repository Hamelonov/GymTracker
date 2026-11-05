import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SetType } from '@/domain/types';
import { Icon, ListItem, Sheet, Text, radius, useColors } from '@/ui';

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
  const colors = useColors();
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.setType')} unpadded>
      {SET_TYPES.map((type) => {
        const isNormal = type === 'normal';
        return (
          <ListItem
            key={type}
            title={translate(`workout.setTypes.${type}`)}
            left={
              <View
                style={[styles.setTypeBadge, { backgroundColor: isNormal ? colors.surfaceAlt : colors.text }]}
              >
                <Text variant="caption" color={isNormal ? colors.text : colors.background}>
                  {isNormal ? '1' : translate(`workout.setTypeShort.${type}`)}
                </Text>
              </View>
            }
            onPress={() => onSetTypeSelect(type)}
          />
        );
      })}
      <ListItem
        title={translate('workout.deleteSet')}
        titleColor={colors.danger}
        left={<Icon icon={Trash2} color="danger" />}
        onPress={onDeleteSetPress}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  setTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
