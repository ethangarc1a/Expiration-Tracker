import React, { useEffect, useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface CardNavItem {
  key: string;
  label: string;
}

interface CardNavProps {
  items: CardNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function CardNav({ items, activeKey, onChange }: CardNavProps) {
  const { colors } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useState(new Animated.Value(0))[0];

  const tabWidth = useMemo(() => {
    return containerWidth > 0 ? containerWidth / items.length : 0;
  }, [containerWidth, items.length]);

  useEffect(() => {
    const index = items.findIndex((item) => item.key === activeKey);
    Animated.timing(indicatorX, {
      toValue: index * tabWidth,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeKey, items, indicatorX, tabWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
      onLayout={handleLayout}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth,
              backgroundColor: colors.primary,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      )}
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => onChange(item.key)}
          >
            <Text style={[styles.label, { color: active ? '#fff' : colors.textSecondary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
