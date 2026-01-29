import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../hooks/useSettings';
import { CategoryPicker } from '../../components/CategoryPicker';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BeamsBackground } from '../../components/BeamsBackground';
import { BlurText } from '../../components/BlurText';
import { exportBackup, importBackup } from '../../services/backup';
import { getAllItems, getItemCount, updateItem as dbUpdateItem } from '../../services/database';
import { rescheduleReminders, cancelReminders } from '../../services/notifications';
import { Platform } from 'react-native';

export default function SettingsScreen() {
  const { colors } = useAppTheme();

  const { settings, updateSettings, setSettingsFromBackup } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleReminderDaysChange = async (value: number) => {
    const next = Math.round(value);
    const days = settings.reminderDays.includes(next)
      ? settings.reminderDays.filter((d) => d !== next)
      : [...settings.reminderDays, next].sort((a, b) => a - b);
    await updateSettings({ reminderDays: days });
    await rescheduleAllReminders(days, settings.reminderTime, settings.notificationSound);
  };

  const handleReminderTimeChange = async (direction: 'up' | 'down') => {
    const nextHour =
      direction === 'up'
        ? (settings.reminderTime.hour + 1) % 24
        : (settings.reminderTime.hour + 23) % 24;
    await updateSettings({
      reminderTime: { ...settings.reminderTime, hour: nextHour },
    });
    await rescheduleAllReminders(
      settings.reminderDays,
      { ...settings.reminderTime, hour: nextHour },
      settings.notificationSound
    );
  };

  const handleReminderMinuteChange = async (direction: 'up' | 'down') => {
    const nextMinute =
      direction === 'up'
        ? (settings.reminderTime.minute + 15) % 60
        : (settings.reminderTime.minute + 45) % 60;
    await updateSettings({
      reminderTime: { ...settings.reminderTime, minute: nextMinute },
    });
    await rescheduleAllReminders(
      settings.reminderDays,
      { ...settings.reminderTime, minute: nextMinute },
      settings.notificationSound
    );
  };

  const handleDefaultCategoryChange = async (category: string) => {
    await updateSettings({ defaultCategory: category });
  };

  const rescheduleAllReminders = async (
    reminderDays: number[],
    reminderTime: { hour: number; minute: number },
    playSound: boolean
  ) => {
    if (Platform.OS === 'web') return;
    setIsRescheduling(true);
    try {
      const allItems = await getAllItems();
      for (const item of allItems) {
        if (item.notificationIds?.length) {
          await cancelReminders(item.notificationIds);
        }
        if (reminderDays.length > 0) {
          const ids = await rescheduleReminders(
            item,
            reminderDays,
            reminderTime,
            playSound
          );
          await dbUpdateItem(item.id, {
            notificationIds: ids,
            notificationId: ids[0] ?? null,
          });
        } else {
          await dbUpdateItem(item.id, {
            notificationIds: [],
            notificationId: null,
          });
        }
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const itemCount = await getItemCount();
      if (itemCount === 0) {
        Alert.alert('No Data', 'There are no items to export.');
        return;
      }

      const success = await exportBackup(settings);
      if (!success) {
        Alert.alert('Export Failed', 'Could not export backup. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import Backup',
      'This will add items from the backup file. Existing items will not be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setIsImporting(true);
            try {
              const result = await importBackup();

              if (result.success) {
                // Restore settings if included
                if (result.settings) {
                  await setSettingsFromBackup(result.settings);
                  await rescheduleAllReminders(
                    result.settings.reminderDays,
                    result.settings.reminderTime,
                    result.settings.notificationSound
                  );
                }

                Alert.alert(
                  'Import Successful',
                  `Imported ${result.itemCount} item(s).`
                );
              } else {
                Alert.alert('Import Failed', result.error || 'Unknown error');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred during import.');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <BeamsBackground />
      <View style={styles.header}>
        <BlurText style={[styles.title, { color: colors.text }]}>
          Settings
        </BlurText>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your reminders and theme
        </Text>
      </View>
      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Reminder Days (multi)
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Tap to toggle days before expiration
              </Text>
            </View>
            <Text style={[styles.settingValue, { color: colors.primary }]}>
              {settings.reminderDays.length === 0
                ? 'Off'
                : settings.reminderDays.join(', ')}
            </Text>
          </View>

          <View style={styles.reminderChips}>
            {[0, 1, 3, 7, 14].map((day) => {
              const isActive = settings.reminderDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.reminderChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleReminderDaysChange(day)}
                >
                  <Text style={{ color: isActive ? '#fff' : colors.textSecondary }}>
                    {day === 0 ? 'Same day' : `${day}d`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timeRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Reminder Time</Text>
            <View style={styles.timeControls}>
              <View style={styles.timeColumn}>
                <TouchableOpacity onPress={() => handleReminderTimeChange('up')}>
                  <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {String(settings.reminderTime.hour).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => handleReminderTimeChange('down')}>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.timeText, { color: colors.text }]}>:</Text>
              <View style={styles.timeColumn}>
                <TouchableOpacity onPress={() => handleReminderMinuteChange('up')}>
                  <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {String(settings.reminderTime.minute).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => handleReminderMinuteChange('down')}>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Notification Sound
            </Text>
            <Switch
              value={settings.notificationSound}
              onValueChange={(value) =>
                updateSettings({ notificationSound: value }).then(() =>
                  rescheduleAllReminders(
                    settings.reminderDays,
                    settings.reminderTime,
                    value
                  )
                )
              }
            />
          </View>

          {isRescheduling ? (
            <View style={styles.rescheduleRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Rescheduling reminders...
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Defaults Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Defaults
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <CategoryPicker
            value={settings.defaultCategory}
            onValueChange={handleDefaultCategoryChange}
            label="Default Category"
          />
          <View style={styles.inputRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Default Quantity
            </Text>
            <TextInput
              style={[
                styles.numberInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              keyboardType="number-pad"
              value={String(settings.defaultQuantity)}
              onChangeText={(value) =>
                updateSettings({ defaultQuantity: Math.max(1, parseInt(value || '1', 10)) })
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Auto-delete expired after (days)
            </Text>
            <TextInput
              style={[
                styles.numberInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              keyboardType="number-pad"
              value={String(settings.autoDeleteExpiredDays)}
              onChangeText={(value) =>
                updateSettings({ autoDeleteExpiredDays: Math.max(0, parseInt(value || '0', 10)) })
              }
            />
          </View>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
          <View style={styles.reminderChips}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isActive = settings.themePreference === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.reminderChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateSettings({ themePreference: mode })}
                >
                  <Text style={{ color: isActive ? '#fff' : colors.textSecondary }}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Language</Text>
          <View style={styles.reminderChips}>
            {['en', 'es', 'fr'].map((lang) => {
              const isActive = settings.language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.reminderChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateSettings({ language: lang })}
                >
                  <Text style={{ color: isActive ? '#fff' : colors.textSecondary }}>
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Backup Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Backup & Restore
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.backupButton}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={24} color={colors.primary} />
            )}
            <View style={styles.backupButtonText}>
              <Text style={[styles.backupButtonTitle, { color: colors.text }]}>
                Export Backup
              </Text>
              <Text style={[styles.backupButtonDescription, { color: colors.textSecondary }]}>
                Save all items and settings to a JSON file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.backupButton}
            onPress={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="upload-outline" size={24} color={colors.primary} />
            )}
            <View style={styles.backupButtonText}>
              <Text style={[styles.backupButtonTitle, { color: colors.text }]}>
                Import Backup
              </Text>
              <Text style={[styles.backupButtonDescription, { color: colors.textSecondary }]}>
                Restore items from a backup file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
              Version
            </Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
              App Name
            </Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>
              ExpiryBuddy
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    position: 'relative',
  },
  header: {
    gap: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  reminderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  reminderChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeRow: {
    marginTop: 16,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rescheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  inputRow: {
    marginTop: 16,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    width: 100,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backupButtonText: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  backupButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  backupButtonDescription: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});
