import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, startOfDay } from 'date-fns';
import { useItem } from '../../hooks/useItems';
import { useSettings } from '../../hooks/useSettings';
import {
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
  getItemById,
} from '../../services/database';
import {
  rescheduleReminders,
  cancelReminder,
  cancelReminders,
} from '../../services/notifications';
import { CategoryPicker } from '../../components/CategoryPicker';
import { DateInput } from '../../components/DateInput';
import { StatusBadge } from '../../components/StatusBadge';
import {
  formatDateForDisplay,
  parseStoredDate,
} from '../../services/dateParser';
import { ItemStatus } from '../../types';
import { useAppTheme } from '../../hooks/useAppTheme';
import * as ImagePicker from 'expo-image-picker';
import { BlurText } from '../../components/BlurText';
import { ImageCarousel } from '../../components/ImageCarousel';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();

  const itemId = parseInt(id, 10);
  const { item, loading, error, refresh } = useItem(itemId);
  const { settings } = useSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [recurrenceDays, setRecurrenceDays] = useState('');

  // Initialize form when item loads
  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity.toString());
      setExpirationDate(item.expirationDate);
      setNotes(item.notes || '');
      setPhotoUris(item.photoUris ?? []);
      setRecurrenceDays(item.recurrenceDays ? String(item.recurrenceDays) : '');
    }
  }, [item]);

  const getItemStatus = (): ItemStatus => {
    if (!item) return 'ok';
    const today = startOfDay(new Date());
    const expiry = parseStoredDate(item.expirationDate);
    const daysUntil = differenceInDays(expiry, today);

    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 7) return 'soon';
    return 'ok';
  };

  const getDaysUntilExpiry = (): number => {
    if (!item) return 0;
    const today = startOfDay(new Date());
    const expiry = parseStoredDate(item.expirationDate);
    return differenceInDays(expiry, today);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }

    if (!expirationDate) {
      Alert.alert('Error', 'Please select an expiration date.');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    const recurrenceValue = recurrenceDays ? parseInt(recurrenceDays, 10) : null;
    if (recurrenceDays && (isNaN(recurrenceValue ?? 0) || (recurrenceValue ?? 0) < 1)) {
      Alert.alert('Error', 'Please enter a valid recurrence interval.');
      return;
    }

    setIsSaving(true);

    try {
      const updates = {
        name: name.trim(),
        category,
        quantity: qty,
        expirationDate,
        notes: notes.trim() || null,
        photoUris,
        recurrenceDays: recurrenceValue,
      };

      await dbUpdateItem(itemId, updates);

      // Reschedule notification if date changed
      if (item && expirationDate !== item.expirationDate) {
        const updatedItem = await getItemById(itemId);
        if (updatedItem && settings.reminderDays.length > 0) {
          const notificationIds = await rescheduleReminders(
            updatedItem,
            settings.reminderDays,
            settings.reminderTime,
            settings.notificationSound
          );
          await dbUpdateItem(itemId, {
            notificationIds,
            notificationId: notificationIds[0] ?? null,
          });
        }
      }

      setIsEditing(false);
      refresh();
      Alert.alert('Success', 'Item updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (item?.notificationIds?.length) {
                await cancelReminders(item.notificationIds);
              } else if (item?.notificationId) {
                await cancelReminder(item.notificationId);
              }
              await dbDeleteItem(itemId);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity.toString());
      setExpirationDate(item.expirationDate);
      setNotes(item.notes || '');
      setPhotoUris(item.photoUris ?? []);
      setRecurrenceDays(item.recurrenceDays ? String(item.recurrenceDays) : '');
    }
    setIsEditing(false);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Item Not Found
        </Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'This item may have been deleted.'}
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getItemStatus();
  const daysUntil = getDaysUntilExpiry();

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Item' : 'Item Details',
          headerRight: () =>
            !isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={22} color={colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isEditing && (
            <View style={styles.titleRow}>
              <BlurText style={[styles.titleText, { color: colors.text }]}>
                {item.name}
              </BlurText>
            </View>
          )}

          {!isEditing && item.photoUris?.length ? (
            <ImageCarousel uris={item.photoUris} height={200} />
          ) : null}

          {/* Status Header (view mode only) */}
          {!isEditing && (
            <View style={[styles.statusHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.statusInfo}>
                <StatusBadge status={status} daysUntilExpiry={Math.max(0, daysUntil)} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {daysUntil < 0
                    ? `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                    : daysUntil === 0
                    ? 'Expires today'
                    : `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Text style={[styles.expirationDate, { color: colors.text }]}>
                {formatDateForDisplay(item.expirationDate)}
              </Text>
            </View>
          )}

          {/* Form/Details */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Item Name
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Item name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />
              ) : (
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {item.name}
                </Text>
              )}
            </View>

            {/* Category */}
            {isEditing ? (
              <CategoryPicker value={category} onValueChange={setCategory} />
            ) : (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Category
                </Text>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {item.category}
                </Text>
              </View>
            )}

            {/* Expiration Date */}
            {isEditing ? (
              <DateInput
                value={expirationDate}
                onValueChange={setExpirationDate}
                label="Expiration Date"
                minimumDate={new Date()}
              />
            ) : null}

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Quantity
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.textInput,
                    styles.quantityInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {item.quantity}
                </Text>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.textInput,
                    styles.notesInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text
                  style={[
                    styles.valueText,
                    { color: item.notes ? colors.text : colors.textSecondary },
                  ]}
                >
                  {item.notes || 'No notes'}
                </Text>
              )}
            </View>

            {/* Recurrence */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Repeat Every (days)
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.textInput,
                    styles.quantityInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={recurrenceDays}
                  onChangeText={setRecurrenceDays}
                  placeholder="e.g., 30"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {item.recurrenceDays ? `${item.recurrenceDays} days` : 'None'}
                </Text>
              )}
            </View>

            {/* Photos */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Photos</Text>
              <View style={styles.photoRow}>
                {photoUris.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                ))}
              </View>
              {isEditing && (
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoButton, { borderColor: colors.border }]}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                      Choose Photos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, { borderColor: colors.border }]}
                    onPress={handleTakePhoto}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Metadata (view mode only) */}
            {!isEditing && (
              <View style={styles.metadata}>
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  Added: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.updatedAt !== item.createdAt && (
                  <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                    Modified: {new Date(item.updatedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Ionicons name="close" size={20} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.viewActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={async () => {
                  const currentQty = item.quantity;
                  if (currentQty <= 0) return;
                  await dbUpdateItem(itemId, { quantity: currentQty - 1 });
                  refresh();
                }}
              >
                <Ionicons name="remove-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Consume One</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.deleteButton,
                  { backgroundColor: colors.errorLight, borderColor: colors.error },
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Delete Item
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  titleRow: {
    marginBottom: 8,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 14,
  },
  expirationDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  quantityInput: {
    width: 100,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
    lineHeight: 24,
  },
  metadata: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 4,
  },
  metadataText: {
    fontSize: 13,
  },
  editActions: {
    gap: 12,
  },
  viewActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  deleteButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
