import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
import { layout, spacing } from './tokens';

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

/** Обычная шапка: заголовок слева, сразу за стрелкой, как принято на Android. */
function HeaderBar({
  title,
  subtitle,
  backButton,
  left,
  right,
  onBack,
}: Pick<HeaderProps, 'title' | 'subtitle' | 'backButton' | 'left' | 'right' | 'onBack'>) {
  const { t: translate } = useTranslation();
  const isCloseButton = backButton === 'close';
  const hasLeadingControl = Boolean(backButton || left);
  return (
    <View style={styles.headerBar}>
      {backButton ? (
        <Pressable
          onPress={onBack ?? goBackOrHome}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={translate(isCloseButton ? 'common.close' : 'common.back')}
          style={styles.backButton}
        >
          <Icon icon={isCloseButton ? X : ArrowLeft} size={24} />
        </Pressable>
      ) : (
        left
      )}
      <View style={[styles.headerTitleColumn, hasLeadingControl ? null : styles.headerTitleAtScreenEdge]}>
        {title ? (
          <Text variant="h3" numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function Header({ title, subtitle, large, backButton, right, left, largeRight, onBack }: HeaderProps) {
  if (!large) {
    return (
      <HeaderBar
        title={title}
        subtitle={subtitle}
        backButton={backButton}
        left={left}
        right={right}
        onBack={onBack}
      />
    );
  }
  // Пустая верхняя строка над крупным заголовком съедала бы 44 dp на каждой вкладке.
  const hasTopRow = Boolean(backButton || left || right);
  return (
    <View>
      {hasTopRow ? <HeaderBar backButton={backButton} left={left} right={right} onBack={onBack} /> : null}
      {title ? (
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
  /** Экран вкладки: панель вкладок сама занимает своё место, системный отступ снизу не нужен. */
  tabScreen?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  header,
  scrollable = true,
  padded = true,
  tabScreen,
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
        { paddingBottom: (tabScreen ? 0 : insets.bottom) + spacing.xl },
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    // Вместе с полями кнопки это ставит стрелку ровно на линию поля экрана 16 dp.
    paddingLeft: spacing.xs,
    // Значок 20 в кнопке 40 отступает от её края на 10, вместе с этим получается те же 16 dp.
    paddingRight: 6,
  },
  backButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleColumn: { flex: 1 },
  headerTitleAtScreenEdge: { paddingLeft: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: spacing.xs },
  largeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  largeTitleColumn: { flex: 1 },
  largeSubtitle: { marginTop: spacing.xxs },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
