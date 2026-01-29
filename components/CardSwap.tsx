import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface CardSwapProps {
  cards: string[];
  intervalMs?: number;
}

export function CardSwap({ cards, intervalMs = 2600 }: CardSwapProps) {
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setIndex((prev) => (prev + 1) % cards.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [cards.length, intervalMs, opacity]);

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Animated.Text style={[styles.text, { color: colors.text, opacity }]}>
        {cards[index]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
