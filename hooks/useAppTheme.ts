import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';
import { useSettings } from './useSettings';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  const themePreference = settings.themePreference ?? 'system';
  const resolvedScheme =
    themePreference === 'system' ? systemScheme : themePreference;
  const isDark = resolvedScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return { isDark, colors, scheme: resolvedScheme };
}
