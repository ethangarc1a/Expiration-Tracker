import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { recognizeText } from '../services/ocr';
import { formatDateForStorage, formatDateForDisplay } from '../services/dateParser';
import { ParsedDate } from '../types';
import { useAppTheme } from '../hooks/useAppTheme';
import { DateInput } from './DateInput';

interface OCRPreviewProps {
  onDateExtracted: (date: string, rawText: string) => void;
  onCancel: () => void;
}

export function OCRPreview({ onDateExtracted, onCancel }: OCRPreviewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedDate, setExtractedDate] = useState<ParsedDate | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [editedDate, setEditedDate] = useState<string>('');
  const cameraRef = useRef<CameraView>(null);

  const { colors } = useAppTheme();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Scanning Not Available
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            OCR scanning requires a mobile build. Please use manual entry on the web demo.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Back to Form
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      const result = await recognizeText(photo.uri);
      setOcrText(result.text);

      if (result.extractedDate) {
        setExtractedDate(result.extractedDate);
      } else {
        Alert.alert(
          'No Date Found',
          'Could not detect an expiration date in the image. Please try again or enter the date manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDate = () => {
    if (extractedDate) {
      const dateStr = editedDate || formatDateForStorage(extractedDate.date);
      onDateExtracted(dateStr, ocrText);
    }
  };

  const handleRetry = () => {
    setExtractedDate(null);
    setOcrText('');
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need camera access to scan expiration dates on product labels.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show extracted date confirmation
  if (extractedDate) {
    const displayDate = editedDate
      ? formatDateForDisplay(editedDate)
      : formatDateForDisplay(formatDateForStorage(extractedDate.date));
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.resultCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Date Found!
            </Text>
            <Text style={[styles.resultDate, { color: colors.primary }]}>
              {displayDate}
            </Text>
            <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
              Confidence: {extractedDate.confidence}
            </Text>
            {extractedDate.rawMatch && (
              <Text style={[styles.rawMatchText, { color: colors.textSecondary }]}>
                Found: "{extractedDate.rawMatch}"
              </Text>
            )}
          </View>

          <View style={styles.ocrPreview}>
            <Text style={[styles.ocrLabel, { color: colors.text }]}>OCR Text</Text>
            <Text style={[styles.ocrText, { color: colors.textSecondary }]}>
              {ocrText || 'No text captured'}
            </Text>
          </View>

          <DateInput
            value={editedDate}
            onValueChange={setEditedDate}
            label="Edit Date (optional)"
          />

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirmDate}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Use This Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Scan Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.instructions}>
            Position the expiration date within the frame
          </Text>

          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 120,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructions: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  resultCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  ocrPreview: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  ocrLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  ocrText: {
    fontSize: 13,
    lineHeight: 18,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  resultDate: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  rawMatchText: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  resultActions: {
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
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
