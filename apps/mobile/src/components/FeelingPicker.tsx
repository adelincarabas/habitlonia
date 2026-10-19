import { FEELING_FAMILIES, findFeeling, type FeelingFamilyKey } from '@habitlonia/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '@/lib/theme';

/** Side view of a brain, front on the left. Each feeling family is a lobe clipped to this outline. */
const BRAIN =
  'M38 118 C30 66 78 26 132 28 C166 12 226 16 254 38 C292 52 308 98 298 138 C302 176 284 200 254 202 ' +
  'C236 204 222 198 212 192 C190 202 150 206 120 198 C94 202 68 192 60 172 C42 164 32 142 38 118 Z';
const STEM = 'M200 186 C206 210 210 226 218 246 L240 246 C232 224 230 206 230 188 Z';

/** Lobe circle (cx, cy, r) and where its label sits. Later lobes are drawn over earlier ones. */
const LOBES: Record<FeelingFamilyKey, { cx: number; cy: number; r: number; x: number; y: number }> = {
  love: { cx: 206, cy: 30, r: 72, x: 200, y: 56 },
  joy: { cx: 98, cy: 44, r: 72, x: 112, y: 82 },
  courage: { cx: 296, cy: 112, r: 64, x: 268, y: 116 },
  peace: { cx: 44, cy: 140, r: 60, x: 70, y: 136 },
  anger: { cx: 188, cy: 132, r: 54, x: 188, y: 138 },
  sadness: { cx: 116, cy: 190, r: 52, x: 120, y: 176 },
  stress: { cx: 266, cy: 198, r: 40, x: 260, y: 184 },
};

/** Two little folds around a label, so the lobes read as brain rather than bubbles. */
function folds(x: number, y: number) {
  return `M${x - 22} ${y - 20} q6 -8 12 0 t12 0 t12 0 M${x - 16} ${y + 16} q6 7 12 0 t12 0`;
}

type Props = {
  /** The entry's tag; a feeling's lowercase name once one is picked. */
  value: string;
  onChange: (tag: string, color: string) => void;
};

/** Pick a feeling by tapping a part of a brain, then one of the feelings that live there. */
export function FeelingPicker({ value, onChange }: Props) {
  const colors = useThemeColors();
  const picked = findFeeling(value);
  const [familyKey, setFamilyKey] = useState<FeelingFamilyKey | null>(picked?.family.key ?? null);
  const family = FEELING_FAMILIES.find((f) => f.key === familyKey) ?? null;
  const feeling = picked?.family.key === familyKey ? picked.feeling : null;

  return (
    <View className="gap-4 rounded-3xl bg-surface p-4">
      <Text className="text-center font-hand text-3xl text-ink">How does your mind feel?</Text>

      <Svg viewBox="0 0 340 250" width="100%" style={{ aspectRatio: 340 / 250 }}>
        <Defs>
          <ClipPath id="brain">
            <Path d={BRAIN} />
          </ClipPath>
        </Defs>
        <Path d={STEM} fill={colors.emptyDay} />
        <Path d={BRAIN} fill={colors.surface} />
        <Path d={BRAIN} fill={colors.inkFaint} fillOpacity={0.25} />
        <G clipPath="url(#brain)">
          {FEELING_FAMILIES.map((f) => {
            const { cx, cy, r } = LOBES[f.key];
            const on = f.key === familyKey;
            return (
              <G key={f.key} onPress={() => setFamilyKey(f.key)}>
                <Circle cx={cx} cy={cy} r={r} fill={colors.surface} stroke={colors.surface} strokeWidth={5} />
                <Circle cx={cx} cy={cy} r={r} fill={f.color} fillOpacity={on ? 1 : familyKey ? 0.1 : 0.24} />
              </G>
            );
          })}
        </G>
        {FEELING_FAMILIES.map((f) => {
          const { x, y } = LOBES[f.key];
          const on = f.key === familyKey;
          const ink = on ? '#FFFFFF' : f.color;
          return (
            <G key={f.key} onPress={() => setFamilyKey(f.key)}>
              <Path
                d={folds(x, y)}
                fill="none"
                stroke={ink}
                strokeOpacity={on ? 0.55 : 0.3}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <SvgText
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize={13}
                fontWeight="600"
                fill={ink}
                fillOpacity={familyKey && !on ? 0.45 : 1}
              >
                {f.label}
              </SvgText>
            </G>
          );
        })}
        <Path d={BRAIN} fill="none" stroke={colors.inkFaint} strokeWidth={2} />
      </Svg>

      {!family && (
        <Text className="text-center text-sm text-ink-muted">Tap the part of your mind that feels loudest right now.</Text>
      )}

      {family && (
        <Animated.View key={family.key} entering={FadeInDown.duration(220)}>
          <View className="gap-3">
            <Text className="text-center text-sm font-medium" style={{ color: family.color }}>
              {family.hint}
            </Text>
            <View className="flex-row flex-wrap justify-center gap-2">
              {family.feelings.map((f) => {
                const on = f.name === feeling?.name;
                return (
                  <Pressable
                    key={f.name}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => onChange(f.name.toLowerCase(), family.color)}
                    className="rounded-full border-2 px-4 py-2 active:opacity-70"
                    style={{ borderColor: family.color, backgroundColor: on ? family.color : 'transparent' }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: on ? '#FFFFFF' : family.color }}>
                      {f.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      )}

      {family && feeling && (
        <Animated.View key={feeling.name} entering={FadeInDown.duration(260)}>
          <View className="gap-1 rounded-2xl px-4 py-3" style={{ backgroundColor: `${family.color}1F` }}>
            <Text className="font-hand text-3xl" style={{ color: family.color }}>
              {feeling.name}
            </Text>
            <Text className="text-base leading-6 text-ink">{feeling.message}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
