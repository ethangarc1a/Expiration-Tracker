import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface BeamsBackgroundProps {
  style?: ViewStyle;
}

export function BeamsBackground({ style }: BeamsBackgroundProps) {
  const { colors } = useAppTheme();

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <View
        style={[
          styles.beam,
          { backgroundColor: colors.primary, opacity: 0.12 },
        ]}
      />
      <View
        style={[
          styles.beam,
          styles.beamSecondary,
          { backgroundColor: colors.primaryLight, opacity: 0.1 },
        ]}
      />
      <View
        style={[
          styles.beam,
          styles.beamTertiary,
          { backgroundColor: colors.success, opacity: 0.08 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  beam: {
    position: 'absolute',
    width: 180,
    height: 600,
    borderRadius: 120,
    top: -120,
    left: -40,
    transform: [{ rotate: '-18deg' }],
  },
  beamSecondary: {
    left: 140,
    top: -80,
    transform: [{ rotate: '10deg' }],
  },
  beamTertiary: {
    right: -60,
    top: 40,
    transform: [{ rotate: '-8deg' }],
  },
});
