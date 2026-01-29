import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FilterType } from '../types';
import { CATEGORIES } from '../constants/categories';
import { useAppTheme } from '../hooks/useAppTheme';

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  showCategories?: boolean;
}

interface FilterOption {
  key: FilterType;
  label: string;
}

const BASE_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'expired', label: 'Expired' },
];

export function FilterBar({
  activeFilter,
  onFilterChange,
  showCategories = true,
}: FilterBarProps) {
  const { colors } = useAppTheme();

  const filters: FilterOption[] = showCategories
    ? [
        ...BASE_FILTERS,
        ...CATEGORIES.map((cat) => ({ key: cat as FilterType, label: cat })),
      ]
    : BASE_FILTERS;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.surfaceVariant,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onFilterChange(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? '#ffffff' : colors.textSecondary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
  },
});
