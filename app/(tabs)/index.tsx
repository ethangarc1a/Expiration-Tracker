import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../../hooks/useItems';
import { useNotificationListeners } from '../../hooks/useNotifications';
import { ItemCard } from '../../components/ItemCard';
import { Item } from '../../types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DateInput } from '../../components/DateInput';
import { CATEGORIES } from '../../constants/categories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingModal } from '../../components/OnboardingModal';
import { AuroraBackground } from '../../components/AuroraBackground';
import { BlurText } from '../../components/BlurText';
import { CardNav } from '../../components/CardNav';
import { AnimatedListItem } from '../../components/AnimatedListItem';
import { BubbleMenu } from '../../components/BubbleMenu';

export default function ItemsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const { items, loading, filter, setFilter, refresh, error, deleteItem, updateItem } =
    useItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'expiry_asc' | 'expiry_desc' | 'name_asc' | 'name_desc' | 'category' | 'recent'>('expiry_asc');
  const sortLabel = useMemo(() => {
    switch (sortOption) {
      case 'expiry_desc':
        return 'Expiry ↓';
      case 'name_asc':
        return 'Name A–Z';
      case 'name_desc':
        return 'Name Z–A';
      case 'category':
        return 'Category';
      case 'recent':
        return 'Recent';
      default:
        return 'Expiry ↑';
    }
  }, [sortOption]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Handle notification tap to navigate to item detail
  const handleNotificationResponse = useCallback(
    (itemId: number) => {
      router.push(`/item/${itemId}`);
    },
    [router]
  );

  useNotificationListeners(undefined, handleNotificationResponse);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem('@expirybuddy:onboarded');
      if (!seen) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}`);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (filter === 'expiring') {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const futureStr = future.toISOString().split('T')[0];
      filtered = filtered.filter(
        (item) => item.expirationDate >= today && item.expirationDate <= futureStr
      );
    } else if (filter === 'expired') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter((item) => item.expirationDate < today);
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) => selectedCategories.includes(item.category));
    }

    if (dateFrom) {
      filtered = filtered.filter((item) => item.expirationDate >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((item) => item.expirationDate <= dateTo);
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.notes ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered];
    switch (sortOption) {
      case 'expiry_desc':
        sorted.sort((a, b) => b.expirationDate.localeCompare(a.expirationDate));
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'recent':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        sorted.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
    }

    return sorted;
  }, [items, filter, selectedCategories, dateFrom, dateTo, debouncedQuery, sortOption]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const futureStr = future.toISOString().split('T')[0];
    const expiringSoon = items.filter(
      (item) => item.expirationDate >= today && item.expirationDate <= futureStr
    ).length;
    const expired = items.filter((item) => item.expirationDate < today).length;
    return {
      total: items.length,
      expiringSoon,
      expired,
    };
  }, [items]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleSelection = (itemId: number) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteItem(id);
    }
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBulkConsume = async () => {
    for (const item of items.filter((i) => selectedIds.includes(i.id))) {
      const newQty = Math.max(0, item.quantity - 1);
      await updateItem(item.id, { quantity: newQty });
    }
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBulkCategoryChange = async (category: string) => {
    for (const item of items.filter((i) => selectedIds.includes(i.id))) {
      await updateItem(item.id, { category });
    }
    setShowCategoryModal(false);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <AnimatedListItem index={index}>
        <ItemCard
          item={item}
          onPress={() =>
            selectionMode ? toggleSelection(item.id) : handleItemPress(item)
          }
          selected={selectedIds.includes(item.id)}
          onLongPress={() => {
            if (!selectionMode) {
              setSelectionMode(true);
              toggleSelection(item.id);
            }
          }}
          onConsume={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}
          onDelete={() => deleteItem(item.id)}
        />
      </AnimatedListItem>
    ),
    [selectionMode, selectedIds, updateItem, deleteItem]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="cube-outline"
        size={80}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Items Found
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {filter === 'all'
          ? 'Add your first item to start tracking expiration dates.'
          : `No items match the "${filter}" filter.`}
      </Text>
      <TouchableOpacity
        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(tabs)/add')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.emptyCtaText}>Add Item</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <OnboardingModal
        visible={showOnboarding}
        onClose={async () => {
          await AsyncStorage.setItem('@expirybuddy:onboarded', 'true');
          setShowOnboarding(false);
        }}
      />
      <View style={styles.header}>
        <BlurText style={[styles.title, { color: colors.text }]}>
          Your Pantry
        </BlurText>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track expirations with style
        </Text>
      </View>
      {error ? (
        <View style={[styles.banner, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={[styles.bannerText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items, categories, notes..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchText, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.sortButton, { borderColor: colors.border }]}
          onPress={() => {
            const order = ['expiry_asc', 'expiry_desc', 'name_asc', 'name_desc', 'category', 'recent'] as const;
            const nextIndex = (order.indexOf(sortOption) + 1) % order.length;
            setSortOption(order[nextIndex]);
          }}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.textSecondary} />
          <Text style={[styles.sortText, { color: colors.textSecondary }]}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expiring</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.expiringSoon}</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expired</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.expired}</Text>
        </View>
      </View>

      <View style={styles.cardNav}>
        <CardNav
          items={[
            { key: 'all', label: 'All' },
            { key: 'expiring', label: 'Expiring' },
            { key: 'expired', label: 'Expired' },
          ]}
          activeKey={filter}
          onChange={(key) => setFilter(key)}
        />
      </View>

      <View style={styles.categoryFilters}>
        {CATEGORIES.map((category) => {
          const isActive = selectedCategories.includes(category);
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleCategory(category)}
            >
              <Text style={{ color: isActive ? '#fff' : colors.textSecondary }}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.dateFilters}>
        <DateInput value={dateFrom} onValueChange={setDateFrom} label="From" />
        <DateInput value={dateTo} onValueChange={setDateTo} label="To" />
      </View>

      {selectionMode && (
        <View style={[styles.bulkBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.bulkText, { color: colors.textSecondary }]}>
            {selectedIds.length} selected
          </Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkButton, { borderColor: colors.border }]}
              onPress={handleBulkConsume}
            >
              <Ionicons name="remove-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.bulkButtonText, { color: colors.textSecondary }]}>
                Consume
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { borderColor: colors.border }]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.bulkButtonText, { color: colors.textSecondary }]}>
                Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { borderColor: colors.error }]}
              onPress={handleBulkDelete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.bulkButtonText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds([]); }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          filteredItems.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Change Category
            </Text>
            <View style={styles.modalList}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.modalItem}
                  onPress={() => handleBulkCategoryChange(category)}
                >
                  <Text style={[styles.modalText, { color: colors.text }]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalClose, { borderColor: colors.border }]}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!selectionMode && (
        <BubbleMenu
          actions={[
            {
              key: 'add',
              icon: 'add-circle-outline',
              onPress: () => router.push('/(tabs)/add'),
            },
            {
              key: 'scan',
              icon: 'camera-outline',
              onPress: () => router.push('/(tabs)/add?mode=scan'),
            },
            {
              key: 'settings',
              icon: 'settings-outline',
              onPress: () => router.push('/(tabs)/settings'),
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyCta: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardNav: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statChip: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoryFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateFilters: {
    paddingHorizontal: 16,
  },
  bulkBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bulkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  bulkButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  banner: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 10,
  },
  modalText: {
    fontSize: 16,
  },
  modalClose: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
  },
});
