import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface BubbleAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface BubbleMenuProps {
  actions: BubbleAction[];
}

export function BubbleMenu({ actions }: BubbleMenuProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    setOpen(!open);
    Animated.spring(progress, {
      toValue,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const animatedActions = useMemo(() => {
    return actions.map((action, index) => {
      const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -60 * (index + 1)],
      });
      const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
      });
      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });
      return { action, translateY, scale, opacity };
    });
  }, [actions, progress]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {animatedActions.map(({ action, translateY, scale, opacity }) => (
        <Animated.View
          key={action.key}
          style={[
            styles.bubble,
            {
              transform: [{ translateY }, { scale }],
              opacity,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={action.onPress}>
            <Ionicons name={action.icon} size={20} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      ))}
      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: colors.primary }]}
        onPress={toggle}
      >
        <Ionicons name={open ? 'close' : 'add'} size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    alignItems: 'center',
  },
  mainButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  bubble: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
  },
});
