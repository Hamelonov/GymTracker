import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { parseSetSeparator } from '@/domain/setSeparator';
import { useSettings } from '@/store/settings';
import { Input, Text, spacing } from '@/ui';

/** Поле для символа между повторами подходов: «9/8/8» можно сделать «9!8!8» или «9·8·8». */
export function SetSeparatorSetting() {
  const { t: translate } = useTranslation();
  const setSeparator = useSettings((state) => state.setSeparator);
  const updateSettings = useSettings((state) => state.update);
  // В поле может быть пусто, пока человек стирает старый символ, а в настройках пустого значения быть не должно.
  const [fieldText, setFieldText] = useState(setSeparator);
  const [isInvalid, setIsInvalid] = useState(false);

  const handleChangeText = (nextText: string) => {
    if (nextText === '') {
      setFieldText('');
      setIsInvalid(false);
      return;
    }
    // Если новый символ набрали рядом со старым («/!»), старый убираем: человек хотел заменить его, а не дописать.
    const typedText = nextText.length > 1 ? nextText.replace(fieldText, '') : nextText;
    const nextSeparator = parseSetSeparator(typedText);
    if (nextSeparator == null) {
      setFieldText(nextText);
      setIsInvalid(true);
      return;
    }
    setFieldText(nextSeparator);
    setIsInvalid(false);
    updateSettings({ setSeparator: nextSeparator });
  };

  // Ушли из поля с пустым или неподходящим текстом: возвращаем последний сохранённый символ.
  const handleBlur = () => {
    setFieldText(setSeparator);
    setIsInvalid(false);
  };

  const example = `9${setSeparator}8${setSeparator}8`;
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text variant="body">{translate('settings.setSeparator')}</Text>
        <Text variant="caption" color={isInvalid ? 'danger' : 'faint'}>
          {isInvalid
            ? translate('settings.setSeparatorInvalid')
            : translate('settings.setSeparatorHint', { example })}
        </Text>
      </View>
      <Input
        value={fieldText}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        // Два знака про запас: эмодзи занимает две кодовые единицы, лишний символ после ввода отбрасывается.
        maxLength={2}
        autoCorrect={false}
        autoCapitalize="none"
        selectTextOnFocus
        textAlign="center"
        containerStyle={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texts: { flex: 1, gap: spacing.xs },
  field: { width: 64 },
});
