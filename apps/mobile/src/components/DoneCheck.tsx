import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import { useThemeColors } from '@/lib/theme';

/** The round check-off button next to a habit. Without `onPress` it's just the icon, for a row that handles the press. */
export function DoneCheck({ done, onPress }: { done: boolean; onPress?: () => void }) {
  const colors = useThemeColors();
  const icon = (
    <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={done ? colors.brand : colors.inkFaint} />
  );
  if (!onPress) return icon;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Done"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      hitSlop={8}
      className="active:opacity-60"
    >
      {icon}
    </Pressable>
  );
}
