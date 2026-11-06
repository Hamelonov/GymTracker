import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { useColors } from './ThemeProvider';
import type { ThemeColors } from './tokens';

export type IconCircleTint = 'accent' | 'coral' | 'success' | 'info' | 'violet';

/** Порядок важен: по нему оттенок выбирается по id, и смена порядка перекрасит все программы. */
export const iconCircleTints: IconCircleTint[] = ['accent', 'coral', 'success', 'info', 'violet'];

/** Один и тот же id всегда даёт один и тот же оттенок: цвет объекта не прыгает между запусками. */
export function pickTintById(id: string): IconCircleTint {
  let hash = 0;
  for (let charIndex = 0; charIndex < id.length; charIndex += 1) {
    hash = (hash * 31 + id.charCodeAt(charIndex)) % 1000003;
  }
  return iconCircleTints[hash % iconCircleTints.length] ?? 'accent';
}

function getTintColors(tint: IconCircleTint, colors: ThemeColors): { background: string; icon: string } {
  const tintColorsByName: Record<IconCircleTint, { background: string; icon: string }> = {
    // Жёлтая иконка на жёлтом фоне не читается, поэтому иконка берёт цвет текста.
    accent: { background: colors.accentSoft, icon: colors.text },
    coral: { background: colors.coralSoft, icon: colors.coral },
    success: { background: colors.successSoft, icon: colors.success },
    info: { background: colors.infoSoft, icon: colors.info },
    violet: { background: colors.violetSoft, icon: colors.violet },
  };
  return tintColorsByName[tint];
}

export interface IconCircleProps {
  icon: LucideIcon;
  tint?: IconCircleTint;
  size?: number;
}

/** Круг с мягким фоном и иконкой чистого цвета: даёт цвет спискам вроде программ и пунктов профиля. */
export function IconCircle({ icon, tint = 'accent', size = 44 }: IconCircleProps) {
  const colors = useColors();
  const tintColors = getTintColors(tint, colors);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tintColors.background },
      ]}
    >
      <Icon icon={icon} size={Math.round(size * 0.46)} color={tintColors.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
