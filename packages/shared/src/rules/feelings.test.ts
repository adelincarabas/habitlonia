import { describe, expect, it } from 'vitest';
import { ENTRY_COLORS } from './entries';
import { FEELING_FAMILIES, findFeeling } from './feelings';

describe('feelings', () => {
  const all = FEELING_FAMILIES.flatMap((f) => f.feelings.map((x) => x.name));

  it('offers twenty distinct feelings', () => {
    expect(all).toHaveLength(20);
    expect(new Set(all).size).toBe(20);
  });

  it('colors each family with a distinct entry color', () => {
    const colors = FEELING_FAMILIES.map((f) => f.color);
    expect(new Set(colors).size).toBe(colors.length);
    for (const c of colors) expect(ENTRY_COLORS).toContain(c);
  });

  it('finds a feeling from its tag', () => {
    expect(findFeeling(' calm ')?.family.key).toBe('peace');
    expect(findFeeling('Overwhelmed')?.feeling.name).toBe('Overwhelmed');
    expect(findFeeling('sleepy')).toBeNull();
  });
});
