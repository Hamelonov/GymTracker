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
  resolve: ((ok: boolean) => void) | null;
  open: (o: DialogOptions) => Promise<boolean>;
  close: (ok: boolean) => void;
}

export const useDialog = create<DialogState>((set, get) => ({
  options: null,
  resolve: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false);
      set({ options, resolve });
    }),
  close: (ok) => {
    get().resolve?.(ok);
    set({ options: null, resolve: null });
  },
}));

/** Imperative confirm: `if (await confirm({ title })) …` */
export function confirm(options: DialogOptions): Promise<boolean> {
  return useDialog.getState().open(options);
}

export function DialogHost() {
  const { t } = useTranslation();
  const options = useDialog((s) => s.options);
  const close = useDialog((s) => s.close);
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
              title={options.confirmLabel ?? t('common.confirm')}
              variant={options.destructive ? 'danger' : 'primary'}
              size="lg"
              full
              onPress={() => close(true)}
            />
            <Button title={options.cancelLabel ?? t('common.cancel')} variant="ghost" full onPress={() => close(false)} />
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
