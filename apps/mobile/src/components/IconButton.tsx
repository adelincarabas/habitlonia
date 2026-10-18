import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'raised' | 'brand';
};

const sizes = { sm: 'h-10 w-10', md: 'h-12 w-12', lg: 'h-20 w-20' } as const;
const iconSizes = { sm: 18, md: 20, lg: 32 } as const;

export function IconButton({ icon, label, onPress, size = 'sm', variant = 'plain' }: Props) {
  const bg = {
    plain: '',
    raised: 'bg-surface shadow-md shadow-black/10',
    brand: 'bg-brand-soft shadow-lg shadow-brand/20',
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`items-center justify-center rounded-full active:opacity-70 ${sizes[size]} ${bg}`}
    >
      <Ionicons name={icon} size={iconSizes[size]} color={variant === 'brand' ? '#2B4BDB' : '#1B1B1F'} />
    </Pressable>
  );
}
