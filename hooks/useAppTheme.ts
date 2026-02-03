import { Colors } from '../constants/colors';

export function useAppTheme() {
  const isDark = true;
  const colors = Colors.dark;

  return { isDark, colors, scheme: 'dark' };
}
