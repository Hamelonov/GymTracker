import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** Открыта ли клавиатура. Только сам факт: за её положением по кадрам этот хук не следит. */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  return isKeyboardVisible;
}
