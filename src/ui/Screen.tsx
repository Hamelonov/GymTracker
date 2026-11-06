import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { spacing } from './tokens';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  large?: boolean;
  backButton?: boolean | 'close';
  right?: React.ReactNode;
  left?: React.ReactNode;
  onBack?: () => void;
  /** Элемент в одной строке с крупным заголовком (`large`), справа от текста, а не над ним. */
  largeRight?: React.ReactNode;
}

/** Возвращает назад или на главную вкладку, если экран открыт напрямую (возвращаться некуда). */
function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Header({ title, subtitle, large, backButton, right, left, largeRight, onBack }: HeaderProps) {
  const colors = useColors();
  const handleBackPress = onBack ?? goBackOrHome;
  const showsSmallTitle = !large && title;
  const showsLargeTitle = large && title;
  // Пустую строку над крупным заголовком не рисуем: она только съедает место.
  const hasTopRowContent = !!backButton || !!left || !!right || !!showsSmallTitle;
  return (
    <View style={[styles.header, large ? styles.headerLarge : null]}>
      {hasTopRowContent ? (
        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            {backButton ? (
              <Pressable
                onPress={handleBackPress}
                hitSlop={12}
                style={[styles.backButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Icon icon={backButton === 'close' ? X : ArrowLeft} size={20} />
              </Pressable>
            ) : (
              left
            )}
          </View>
          {showsSmallTitle ? (
            <View style={styles.headerCenter}>
              <Text variant="h3" numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.headerCenter} />
          )}
          <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
        </View>
      ) : null}
      {showsLargeTitle ? (
        <View style={styles.largeTitleRow}>
          <View style={styles.largeTitleColumn}>
            <Text variant="h1">{title}</Text>
            {subtitle ? (
              <Text variant="body" color="muted" style={styles.largeSubtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {largeRight}
        </View>
      ) : null}
    </View>
  );
}

export interface ScreenProps extends ScrollViewProps {
  header?: HeaderProps;
  scrollable?: boolean;
  padded?: boolean;
  bottomInset?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  header,
  scrollable = true,
  padded = true,
  bottomInset = true,
  children,
  footer,
  contentStyle,
  ...rest
}: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[
        padded ? styles.padded : null,
        { paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.xxl },
        contentStyle,
        rest.contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded ? styles.padded : null, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {header ? <Header {...header} /> : null}
      {content}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  headerLarge: { paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  headerSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { justifyContent: 'flex-end', flexShrink: 0 },
  headerCenter: { flex: 1, alignItems: 'center' },
  largeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  largeTitleColumn: { flex: 1 },
  largeSubtitle: { marginTop: 2 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
