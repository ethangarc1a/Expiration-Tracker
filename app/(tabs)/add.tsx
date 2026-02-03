import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../../hooks/useItems';
import { useSettings } from '../../hooks/useSettings';
import { CategoryPicker } from '../../components/CategoryPicker';
import { DateInput } from '../../components/DateInput';
import { OCRPreview } from '../../components/OCRPreview';
import { useAppTheme } from '../../hooks/useAppTheme';
import * as ImagePicker from 'expo-image-picker';
import { AuroraBackground } from '../../components/AuroraBackground';
import { BlurText } from '../../components/BlurText';

type AddMode = 'manual' | 'scan';

export default function AddScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ mode?: string }>();

  const { addItem } = useItems();
  const { settings } = useSettings();

  const [mode, setMode] = useState<AddMode>('manual');
  useEffect(() => {
    if (params.mode === 'scan' && Platform.OS !== 'web') {
      setMode('scan');
    } else if (Platform.OS === 'web') {
      setMode('manual');
    }
  }, [params.mode]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(settings.defaultCategory);
  const [quantity, setQuantity] = useState(String(settings.defaultQuantity || 1));
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [recurrenceDays, setRecurrenceDays] = useState('');

  const resetForm = () => {
    setName('');
    setCategory(settings.defaultCategory);
    setQuantity(String(settings.defaultQuantity || 1));
    setExpirationDate('');
    setNotes('');
    setPhotoUris([]);
    setRecurrenceDays('');
  };

  const handleSubmit = async () => {
    // Validation
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

    setIsSubmitting(true);

    try {
      const result = await addItem({
        name: name.trim(),
        category,
        quantity: qty,
        expirationDate,
        notes: notes.trim() || null,
        photoUris,
        recurrenceDays: recurrenceValue,
      });

      if (result) {
        Alert.alert('Success', `"${name}" has been added.`, [
          {
            text: 'Add Another',
            onPress: resetForm,
          },
          {
            text: 'View Items',
            onPress: () => {
              resetForm();
              router.push('/(tabs)');
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOCRDateExtracted = (date: string, rawText: string) => {
    setExpirationDate(date);
    setMode('manual');

    // Try to extract a product name from OCR text (first non-date line)
    if (!name && rawText) {
      const lines = rawText.split('\n').filter((line) => line.trim());
      const nameCandidate = lines.find(
        (line) =>
          !line.match(/exp|best|use|sell|bb|\d{1,2}[\/\-]\d{1,2}/i) &&
          line.length > 2 &&
          line.length < 50
      );
      if (nameCandidate) {
        setName(nameCandidate.trim());
      }
    }
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
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Show OCR camera view
  if (mode === 'scan') {
    return (
      <OCRPreview
        onDateExtracted={handleOCRDateExtracted}
        onCancel={() => setMode('manual')}
      />
    );
  }

  // Manual entry form
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuroraBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BlurText style={[styles.title, { color: colors.text }]}>
            Add Item
          </BlurText>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Capture details with a clean, animated flow
          </Text>
          {Platform.OS === 'web' && (
            <Text style={[styles.webHint, { color: colors.textSecondary }]}>
              Web demo mode: scanning is available on mobile builds only.
            </Text>
          )}
        </View>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { backgroundColor: colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => setMode('manual')}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#fff"
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: '#fff' },
              ]}
            >
              Manual
            </Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: colors.border },
              ]}
              onPress={() => setMode('scan')}
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Scan
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Item Name *
            </Text>
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
              placeholder="e.g., Milk, Yogurt, Medicine"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />
          </View>

          {/* Category */}
          <CategoryPicker value={category} onValueChange={setCategory} />

          {/* Expiration Date */}
          <DateInput
            value={expirationDate}
            onValueChange={setExpirationDate}
            label="Expiration Date *"
            minimumDate={new Date()}
          />

          {/* Quantity */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Quantity</Text>
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
          </View>

          {/* Recurrence */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Repeat Every (days)
            </Text>
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
          </View>

          {/* Photos */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Photos</Text>
            <View style={styles.photoRow}>
              {photoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photoThumb} />
              ))}
            </View>
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
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Notes (optional)
            </Text>
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
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  webHint: {
    fontSize: 12,
    marginTop: 6,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
