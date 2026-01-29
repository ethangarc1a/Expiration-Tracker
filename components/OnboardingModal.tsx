import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import { AuroraBackground } from './AuroraBackground';
import { CardSwap } from './CardSwap';
import { BlurText } from './BlurText';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AuroraBackground />
          <Ionicons name="sparkles" size={48} color={colors.primary} />
          <BlurText style={[styles.title, { color: colors.text }]}>
            Welcome to ExpiryBuddy
          </BlurText>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Track expiration dates, get reminders, and keep your pantry organized.
          </Text>
          <CardSwap
            cards={[
              'Set smart reminders for soon-to-expire items',
              'Swipe through photos for quick recognition',
              'Use filters to find what needs attention',
            ]}
          />
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
