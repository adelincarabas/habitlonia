import { ENTRY_COLORS } from './entries';

/**
 * Twenty everyday feelings from the Hoffman feelings list, grouped into the families the add
 * screen draws as parts of a brain. Each one carries a short note on what the feeling might be
 * telling you; a picked feeling is saved as the entry's tag (its lowercase name).
 */
export const FEELING_FAMILIES = [
  {
    key: 'joy',
    label: 'Joy',
    color: ENTRY_COLORS[3],
    hint: "The lit-up part. What's making you feel alive?",
    feelings: [
      { name: 'Happy', message: 'Something is going right. Notice what it is, so you can find your way back here.' },
      { name: 'Excited', message: "Your energy is leaning toward something. That's a clue about what matters to you." },
      { name: 'Inspired', message: 'An idea wants to come through you. Write down the first step before it fades.' },
    ],
  },
  {
    key: 'peace',
    label: 'Peace',
    color: ENTRY_COLORS[0],
    hint: 'The quiet part. Where do you feel settled?',
    feelings: [
      { name: 'Calm', message: 'Your body feels safe right now. Let this be the place you come back to.' },
      { name: 'Content', message: 'Nothing is missing in this moment. "Enough" is a feeling worth remembering.' },
      { name: 'Relaxed', message: "You've stopped holding on so tight. Notice what helped you get here." },
    ],
  },
  {
    key: 'love',
    label: 'Love',
    color: ENTRY_COLORS[4],
    hint: 'The open part. Who or what are you close to?',
    feelings: [
      { name: 'Loving', message: 'Your heart is open. Who or what is it open to right now?' },
      { name: 'Grateful', message: "You're seeing what you've been given. Name one thing, and it grows." },
      { name: 'Hopeful', message: 'Part of you believes it can get better. Trust that part a little today.' },
    ],
  },
  {
    key: 'courage',
    label: 'Courage',
    color: ENTRY_COLORS[6],
    hint: 'The strong part. Where are you standing tall?',
    feelings: [
      { name: 'Confident', message: 'You trust yourself right now. Remember this when doubt shows up later.' },
      { name: 'Proud', message: 'You did something that matters to you. Let yourself take it in.' },
    ],
  },
  {
    key: 'sadness',
    label: 'Sadness',
    color: ENTRY_COLORS[5],
    hint: 'The heavy part. What are you missing?',
    feelings: [
      { name: 'Disappointed', message: "Something you hoped for didn't happen. It shows you what you care about." },
      { name: 'Lonely', message: "You're longing to be close to someone. Reaching out, even a little, counts." },
      { name: 'Empty', message: 'Feeling numb can be a way of protecting yourself from too much. Go gently.' },
    ],
  },
  {
    key: 'anger',
    label: 'Anger',
    color: ENTRY_COLORS[1],
    hint: 'The hot part. What crossed a line?',
    feelings: [
      { name: 'Frustrated', message: 'Something is in your way. Is it worth pushing through, or going around?' },
      { name: 'Resentful', message: "An old hurt hasn't been heard yet. What do you wish you had said?" },
    ],
  },
  {
    key: 'stress',
    label: 'Stress',
    color: ENTRY_COLORS[2],
    hint: "The tense part. What's pressing on you?",
    feelings: [
      { name: 'Anxious', message: 'Your mind is scanning ahead for danger. Come back to one breath, then one thing you can do.' },
      { name: 'Worried', message: "You're caring about something that hasn't happened yet. What would actually help?" },
      { name: 'Overwhelmed', message: 'Too much is asking for you at once. Pick only the next small step.' },
      { name: 'Exhausted', message: 'Your body is asking for rest, not more effort. Listen to it.' },
    ],
  },
] as const satisfies readonly {
  key: string;
  label: string;
  color: string;
  hint: string;
  feelings: readonly { name: string; message: string }[];
}[];

export type FeelingFamily = (typeof FEELING_FAMILIES)[number];
export type FeelingFamilyKey = FeelingFamily['key'];
export type Feeling = FeelingFamily['feelings'][number];

/** The feeling a tag names (case-insensitive) and its family, or null for a free-typed tag. */
export function findFeeling(tag: string): { family: FeelingFamily; feeling: Feeling } | null {
  const name = tag.trim().toLowerCase();
  for (const family of FEELING_FAMILIES) {
    const feeling = family.feelings.find((f: Feeling) => f.name.toLowerCase() === name);
    if (feeling) return { family, feeling };
  }
  return null;
}
