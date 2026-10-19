import { useColorScheme } from 'nativewind';

/** Mirrors the tokens in global.css, for props that can't take a className (icon colors, etc.). */
const palette = {
  light: { brand: '#2B4BDB', ink: '#1B1B1F', inkFaint: '#B9B9C0', surface: '#FFFFFF', emptyDay: '#D9DCE8' },
  dark: { brand: '#7C93F5', ink: '#F2F2F5', inkFaint: '#5A5A64', surface: '#1C1C21', emptyDay: '#2A2D3A' },
} as const;

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return palette[colorScheme === 'dark' ? 'dark' : 'light'];
}
