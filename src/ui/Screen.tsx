import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import React from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
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
  back?: boolean | 'close';
  right?: React.ReactNode;
  left?: React.ReactNode;
  onBack?: () => void;
}

export function Header({ title, subtitle, large, back, right, left, onBack }: HeaderProps) {
  const c = useColors();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={[styles.header, large ? styles.headerLarge : null]}>
      <View style={styles.headerRow}>
        <View style={styles.headerSide}>
          {back ? (
            <Pressable onPress={goBack} hitSlop={12} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
              <Icon icon={back === 'close' ? X : ArrowLeft} size={20} />
            </Pressable>
          ) : (
            left
          )}
        </View>
        {!large && title ? (
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
      {large && title ? (
        <View style={styles.largeTitle}>
          <Text variant="h1">{title}</Text>
          {subtitle ? (
            <Text variant="body" color="muted" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export interface ScreenProps extends ScrollViewProps {
  header?: HeaderProps;
  scroll?: boolean;
  padded?: boolean;
  bottomInset?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ header, scroll = true, padded = true, bottomInset = true, children, footer, contentStyle, ...rest }: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
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
    <View style={[styles.flex, padded ? styles.padded : null, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {header ? <Header {...header} /> : null}
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: c.border, backgroundColor: c.bg }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  headerLarge: { paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  headerSide: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { justifyContent: 'flex-end', flexShrink: 0 },
  headerCenter: { flex: 1, alignItems: 'center' },
  largeTitle: { marginTop: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
