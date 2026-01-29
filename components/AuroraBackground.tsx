import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface AuroraBackgroundProps {
  style?: ViewStyle;
}

export function AuroraBackground({ style }: AuroraBackgroundProps) {
  const { colors } = useAppTheme();
  const blob1 = useRef(new Animated.ValueXY({ x: -40, y: -20 })).current;
  const blob2 = useRef(new Animated.ValueXY({ x: 120, y: 40 })).current;
  const blob3 = useRef(new Animated.ValueXY({ x: -80, y: 140 })).current;

  useEffect(() => {
    const animateBlob = (blob: Animated.ValueXY, toX: number, toY: number, duration: number) =>
      Animated.sequence([
        Animated.timing(blob, {
          toValue: { x: toX, y: toY },
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(blob, {
          toValue: { x: -toX / 2, y: -toY / 2 },
          duration,
          useNativeDriver: true,
        }),
      ]);

    const loop = Animated.loop(
      Animated.parallel([
        animateBlob(blob1, 60, 30, 9000),
        animateBlob(blob2, -40, 80, 11000),
        animateBlob(blob3, 50, -60, 10000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blob1, blob2, blob3]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            backgroundColor: colors.primary,
            opacity: 0.18,
            transform: blob1.getTranslateTransform(),
          },
          style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobSecondary,
          {
            backgroundColor: colors.success,
            opacity: 0.14,
            transform: blob2.getTranslateTransform(),
          },
          style,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobTertiary,
          {
            backgroundColor: colors.primaryLight,
            opacity: 0.16,
            transform: blob3.getTranslateTransform(),
          },
          style,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -40,
    left: -40,
  },
  blobSecondary: {
    width: 260,
    height: 260,
    top: 80,
    right: -80,
  },
  blobTertiary: {
    width: 200,
    height: 200,
    bottom: 40,
    left: 40,
  },
});
