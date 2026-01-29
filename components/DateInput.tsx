import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateForDisplay } from '../services/dateParser';
import { useAppTheme } from '../hooks/useAppTheme';

interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onValueChange: (date: string) => void;
  label?: string;
  minimumDate?: Date;
}

export function DateInput({
  value,
  onValueChange,
  label = 'Expiration Date',
  minimumDate,
}: DateInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      return { year, month, day };
    }
    const base = minimumDate ?? new Date();
    return {
      year: base.getFullYear(),
      month: base.getMonth() + 1,
      day: base.getDate(),
    };
  });

  const { colors } = useAppTheme();

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  
  const days = Array.from(
    { length: getDaysInMonth(tempDate.year, tempDate.month) },
    (_, i) => i + 1
  );

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      setTempDate({ year, month, day });
      return;
    }
    if (minimumDate) {
      setTempDate({
        year: minimumDate.getFullYear(),
        month: minimumDate.getMonth() + 1,
        day: minimumDate.getDate(),
      });
    }
  }, [value, minimumDate]);

  const handleConfirm = () => {
    const dateStr = `${tempDate.year}-${String(tempDate.month).padStart(2, '0')}-${String(tempDate.day).padStart(2, '0')}`;
    onValueChange(dateStr);
    setModalVisible(false);
  };

  const adjustValue = (
    field: 'year' | 'month' | 'day',
    direction: 'up' | 'down'
  ) => {
    setTempDate((prev) => {
      const newDate = { ...prev };
      const delta = direction === 'up' ? 1 : -1;

      if (field === 'year') {
        const newYear = prev.year + delta;
        const minYear = minimumDate ? minimumDate.getFullYear() : new Date().getFullYear();
        if (newYear >= minYear && newYear <= new Date().getFullYear() + 10) {
          newDate.year = newYear;
        }
      } else if (field === 'month') {
        let newMonth = prev.month + delta;
        if (newMonth < 1) newMonth = 12;
        if (newMonth > 12) newMonth = 1;
        newDate.month = newMonth;
        // Adjust day if needed
        const maxDay = getDaysInMonth(newDate.year, newMonth);
        if (newDate.day > maxDay) newDate.day = maxDay;
      } else if (field === 'day') {
        const maxDay = getDaysInMonth(prev.year, prev.month);
        let newDay = prev.day + delta;
        if (newDay < 1) newDay = maxDay;
        if (newDay > maxDay) newDay = 1;
        newDate.day = newDay;
      }

      if (minimumDate) {
        const candidate = new Date(newDate.year, newDate.month - 1, newDate.day);
        if (candidate < minimumDate) {
          return prev;
        }
      }

      return newDate;
    });
  };

  const applyPreset = (daysFromToday: number) => {
    const base = new Date();
    base.setDate(base.getDate() + daysFromToday);
    setTempDate({
      year: base.getFullYear(),
      month: base.getMonth() + 1,
      day: base.getDate(),
    });
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.selector,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {value ? formatDateForDisplay(value) : 'Select date'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Date
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[styles.confirmButton, { color: colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            {[0, 1, 3, 7, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.presetChip, { borderColor: colors.border }]}
                onPress={() => applyPreset(days)}
              >
                <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                  {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `+${days}d`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pickerContainer}>
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('month', 'up')}
              >
                <Ionicons name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {months[tempDate.month - 1]}
              </Text>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('month', 'down')}
              >
                <Ionicons name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Day Picker */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('day', 'up')}
              >
                <Ionicons name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {tempDate.day}
              </Text>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('day', 'down')}
              >
                <Ionicons name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('year', 'up')}
              >
                <Ionicons name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {tempDate.year}
              </Text>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => adjustValue('year', 'down')}
              >
                <Ionicons name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            {months[tempDate.month - 1]} {tempDate.day}, {tempDate.year}
          </Text>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 20,
  },
  pickerColumn: {
    alignItems: 'center',
    minWidth: 80,
  },
  arrowButton: {
    padding: 12,
  },
  pickerValue: {
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
  },
  previewText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
