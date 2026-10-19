import Ionicons from '@expo/vector-icons/Ionicons';
import type { RundownSection, RundownTone } from '@habitlonia/shared';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

const TONE_ICONS: Partial<Record<RundownTone, ComponentProps<typeof Ionicons>['name']>> = {
  nudge: 'sparkles',
  done: 'checkmark-circle',
};

type Props = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  section: RundownSection;
};

/** One half of the rundown: a headline, a short summary, then a note per habit or entry. */
export function RundownCard({ label, icon, section }: Props) {
  const colors = useThemeColors();

  return (
    <View className="mx-4 gap-3 rounded-3xl bg-surface p-5 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color={colors.brand} />
        <Text className="text-sm font-semibold text-brand">{label}</Text>
      </View>

      <Text className="font-hand text-3xl leading-8 text-ink">{section.headline}</Text>
      <Text className="text-base leading-6 text-ink">{section.summary}</Text>

      {section.items.length > 0 && (
        <View className="mt-1 gap-4 border-t border-ink-faint/30 pt-4">
          {section.items.map((item, i) => (
            <View key={`${item.title}-${i}`} className="gap-1">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="flex-1 text-base font-semibold text-ink">{item.title}</Text>
                {item.time !== '' && <Text className="text-sm font-medium text-brand">{item.time}</Text>}
              </View>
              <View className="flex-row gap-1.5">
                {TONE_ICONS[item.tone] && (
                  <Ionicons name={TONE_ICONS[item.tone]} size={14} color={colors.brand} style={{ marginTop: 3 }} />
                )}
                <Text className={`flex-1 text-sm leading-5 ${item.tone === 'nudge' ? 'text-brand' : 'text-ink-muted'}`}>
                  {item.note}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
