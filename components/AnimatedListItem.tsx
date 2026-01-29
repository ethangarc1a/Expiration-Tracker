import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: index * 35,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay: index * 35,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 260,
        delay: index * 35,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY, scale]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
