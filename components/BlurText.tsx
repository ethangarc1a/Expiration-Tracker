import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

interface BlurTextProps {
  children: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  durationMs?: number;
}

export function BlurText({
  children,
  style,
  containerStyle,
  durationMs = 1800,
}: BlurTextProps) {
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.75,
          duration: durationMs,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: durationMs,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [durationMs, glowOpacity]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.Text
        style={[
          style,
          styles.glowText,
          {
            opacity: glowOpacity,
          },
        ]}
      >
        {children}
      </Animated.Text>
      <Animated.Text style={[style, styles.baseText]}>{children}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glowText: {
    position: 'absolute',
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  baseText: {
    zIndex: 1,
  },
});
