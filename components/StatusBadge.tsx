import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ItemStatus } from '../types';
import { StatusColors } from '../constants/colors';
import { useAppTheme } from '../hooks/useAppTheme';

interface StatusBadgeProps {
  status: ItemStatus;
  daysUntilExpiry?: number;
}

export function StatusBadge({ status, daysUntilExpiry }: StatusBadgeProps) {
  const { isDark } = useAppTheme();

  const getStatusText = (): string => {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'soon':
        if (daysUntilExpiry !== undefined) {
          if (daysUntilExpiry === 0) return 'Today';
          if (daysUntilExpiry === 1) return '1 day';
          return `${daysUntilExpiry} days`;
        }
        return 'Soon';
      case 'ok':
        return 'OK';
    }
  };

  const colors = StatusColors[status];
  const backgroundColor = isDark ? colors.darkBackground : colors.background;
  const textColor = isDark ? colors.darkText : colors.text;
  const borderColor = isDark ? colors.darkBorder : colors.border;

  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
