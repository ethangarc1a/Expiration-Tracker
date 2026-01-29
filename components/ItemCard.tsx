import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, startOfDay } from 'date-fns';
import { Item, ItemStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatDateForDisplay, parseStoredDate } from '../services/dateParser';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  onLongPress?: () => void;
  onConsume?: () => void;
  onDelete?: () => void;
  selected?: boolean;
}

export function ItemCard({
  item,
  onPress,
  onLongPress,
  onConsume,
  onDelete,
  selected = false,
}: ItemCardProps) {
  const { colors } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const getItemStatus = (): ItemStatus => {
    const today = startOfDay(new Date());
    const expiry = parseStoredDate(item.expirationDate);
    const daysUntil = differenceInDays(expiry, today);

    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 7) return 'soon';
    return 'ok';
  };

  const getDaysUntilExpiry = (): number => {
    const today = startOfDay(new Date());
    const expiry = parseStoredDate(item.expirationDate);
    return differenceInDays(expiry, today);
  };

  const status = getItemStatus();
  const daysUntil = getDaysUntilExpiry();
  const relativeText =
    daysUntil < 0
      ? `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
      : daysUntil === 0
      ? 'Expires today'
      : `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      Dairy: 'water-outline',
      Meat: 'restaurant-outline',
      Produce: 'leaf-outline',
      Frozen: 'snow-outline',
      Pantry: 'cube-outline',
      Beverages: 'wine-outline',
      Condiments: 'flask-outline',
      Snacks: 'fast-food-outline',
      Medicine: 'medkit-outline',
      Household: 'home-outline',
      Other: 'ellipsis-horizontal-outline',
    };
    return iconMap[item.category] || 'ellipsis-horizontal-outline';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.98,
          useNativeDriver: true,
          friction: 6,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }).start();
      }}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${item.name}`}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: selected ? colors.primary : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
      {item.photoUris?.length ? (
        <Image source={{ uri: item.photoUris[0] }} style={styles.photo} />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name={getCategoryIcon()} size={24} color={colors.primary} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <StatusBadge status={status} daysUntilExpiry={Math.max(0, daysUntil)} />
        </View>

        <View style={styles.details}>
          <Text style={[styles.category, { color: colors.textSecondary }]}>
            {item.category}
          </Text>
          <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDateForDisplay(item.expirationDate)}
          </Text>
          <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
          <Text style={[styles.relative, { color: colors.textSecondary }]}>
            {relativeText}
          </Text>
          {item.quantity > 1 && (
            <>
              <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.quantity, { color: colors.textSecondary }]}>
                Qty: {item.quantity}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {onConsume ? (
          <TouchableOpacity
            onPress={onConsume}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={`Consume one ${item.name}`}
          >
            <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        ) : null}
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  category: {
    fontSize: 13,
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 13,
  },
  date: {
    fontSize: 13,
  },
  relative: {
    fontSize: 13,
  },
  quantity: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});
