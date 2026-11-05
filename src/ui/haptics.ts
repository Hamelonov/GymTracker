import * as Haptics from 'expo-haptics';
import { useSettings } from '@/store/settings';

export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'none';

/** Настройка читается в момент вызова: подписка на неё в каждой кнопке только добавляла перерисовок. */
export function playHaptic(kind: HapticKind) {
  if (kind === 'none') return;
  if (!useSettings.getState().haptics) return;
  if (kind === 'selection') {
    void Haptics.selectionAsync();
    return;
  }
  if (kind === 'success') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  const impactStyle =
    kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
  void Haptics.impactAsync(impactStyle);
}
