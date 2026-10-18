import { Pressable, Text, View } from 'react-native';

type Tab<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  tabs: readonly Tab<K>[];
  value: K;
  onChange: (key: K) => void;
};

export function SegmentedTabs<K extends string>({ tabs, value, onChange }: Props<K>) {
  return (
    <View className="mx-4 flex-row rounded-full bg-surface p-1 shadow-sm shadow-black/5">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            className={`flex-1 items-center rounded-full py-3 ${active ? 'bg-brand shadow-md shadow-brand/40' : ''}`}
          >
            <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-ink-muted'}`}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
