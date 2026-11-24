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
  /** На корневых вкладках заголовок стоит слева; на вложенных экранах — по центру. */
  titleAlign?: 'center' | 'start';
  backButton?: boolean | 'close';
  right?: React.ReactNode;
  left?: React.ReactNode;
  onBack?: () => void;
}

/** Возвращает назад или на главную вкладку, если экран открыт напрямую (возвращаться некуда). */
function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Header({
  title,
  subtitle,
  titleAlign = 'center',
  backButton,
  right,
  left,
  onBack,
}: HeaderProps) {
  const colors = useColors();
  const handleBackPress = onBack ?? goBackOrHome;
  const isTitleAtStart = titleAlign === 'start';
  const hasLeftContent = Boolean(backButton || left);
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerRow}>
        {hasLeftContent ? (
          <View style={styles.headerSide}>
            {backButton ? (
              <Pressable onPress={handleBackPress} hitSlop={12} style={styles.backButton}>
                <Icon icon={backButton === 'close' ? X : ArrowLeft} size={24} />
              </Pressable>
            ) : (
              left
            )}
          </View>
        ) : null}
        <View style={isTitleAtStart ? styles.headerTitleStart : styles.headerCenter}>
          {title ? (
            <Text variant={isTitleAtStart ? 'h2' : 'h3'} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
      </View>
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
        // Первый блок не должен липнуть к линии под шапкой.
        header ? styles.belowHeader : null,
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
  belowHeader: { paddingTop: spacing.sm },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  headerSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { justifyContent: 'flex-end', flexShrink: 0 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleStart: { flex: 1, alignItems: 'flex-start' },
  // Кнопка «назад» без фона: у шапки теперь есть линия снизу, и кружок только перегружает её.
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
