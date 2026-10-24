import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { spacing } from './tokens';

interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogState {
  options: DialogOptions | null;
  resolve: ((isConfirmed: boolean) => void) | null;
  open: (options: DialogOptions) => Promise<boolean>;
  close: (isConfirmed: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  options: null,
  resolve: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      // Новый диалог заменяет открытый, а это считается «отменой».
      get().resolve?.(false);
      set({ options, resolve });
    }),
  close: (isConfirmed) => {
    get().resolve?.(isConfirmed);
    set({ options: null, resolve: null });
  },
}));

/** Императивное подтверждение: `if (await confirm({ title })) …` */
export function confirm(options: DialogOptions): Promise<boolean> {
  return useDialogStore.getState().open(options);
}

export function DialogHost() {
  const { t: translate } = useTranslation();
  const options = useDialogStore((state) => state.options);
  const close = useDialogStore((state) => state.close);
  return (
    <Sheet visible={options != null} onClose={() => close(false)}>
      {options ? (
        <View>
          <Text variant="h2">{options.title}</Text>
          {options.message ? (
            <Text color="muted" style={styles.message}>
              {options.message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              title={options.confirmLabel ?? translate('common.confirm')}
              variant={options.destructive ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              onPress={() => close(true)}
            />
            <Button
              title={options.cancelLabel ?? translate('common.cancel')}
              variant="ghost"
              fullWidth
              onPress={() => close(false)}
            />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: spacing.sm },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
