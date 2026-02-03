import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface AuroraBackgroundProps {
  style?: ViewStyle;
}

export function AuroraBackground({ style }: AuroraBackgroundProps) {
  const { colors } = useAppTheme();
  const blob1 = useRef(new Animated.ValueXY({ x: -20, y: -10 })).current;
  const blob2 = useRef(new Animated.ValueXY({ x: 60, y: 20 })).current;
  const blob3 = useRef(new Animated.ValueXY({ x: -40, y: 80 })).current;

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
        animateBlob(blob1, 24, 18, 22000),
        animateBlob(blob2, -18, 26, 26000),
        animateBlob(blob3, 20, -22, 24000),
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
            backgroundColor: colors.primaryLight,
            opacity: 0.09,
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
            backgroundColor: colors.primary,
            opacity: 0.07,
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
            opacity: 0.08,
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
