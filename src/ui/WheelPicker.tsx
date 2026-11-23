import React, { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable as NativePressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius } from './tokens';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;

export interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Барабан выбора, как в нативных «часах»: список прокручивается и «прилипает» к строке,
 * а выбранная строка лежит посередине на светлой плашке. Начальное положение задаётся один раз,
 * поэтому, чтобы показать другое значение извне, барабан нужно создавать заново.
 */
export function WheelPicker({ items, selectedIndex, onSelect }: WheelPickerProps) {
  const colors = useColors();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const indexFromOffset = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    return Math.min(items.length - 1, Math.max(0, index));
  };

  const selectIndex = (index: number) => {
    setActiveIndex(index);
    onSelect(index);
  };

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    selectIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.highlight, { backgroundColor: colors.surfaceAlt }]} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        // Барабан лежит в шторке: без этого Android отдаёт жест шторке, а не списку.
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={(event) => setActiveIndex(indexFromOffset(event))}
        onMomentumScrollEnd={(event) => selectIndex(indexFromOffset(event))}
        onScrollEndDrag={(event) => selectIndex(indexFromOffset(event))}
        contentContainerStyle={styles.content}
      >
        {items.map((item, index) => (
          <NativePressable key={index} style={styles.item} onPress={() => scrollToIndex(index)}>
            <Text
              variant="h3"
              color={index === activeIndex ? colors.text : colors.textFaint}
              tabular
              numberOfLines={1}
            >
              {item}
            </Text>
          </NativePressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: ITEM_HEIGHT * VISIBLE_ITEMS },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: radius.md,
  },
  content: { paddingVertical: ITEM_HEIGHT },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
