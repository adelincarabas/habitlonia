import { SONGLESS_CLIP_SECONDS, type SonglessAttempt, type SonglessRoundStatus, type SonglessSong } from '../types';

/** Lowercase, no accents, no "(feat. …)" / "- Remastered 2011" tails, so guesses and lookups match loosely. */
export function normalizeSongText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A guess counts if it's the same song, or the same title and artist (playlists can hold the song twice). */
export function isCorrectGuess(answer: SonglessSong, guess: SonglessSong): boolean {
  if (answer.id === guess.id) return true;
  return (
    normalizeSongText(answer.title) === normalizeSongText(guess.title) &&
    normalizeSongText(answer.artist) === normalizeSongText(guess.artist)
  );
}

/** Songs whose title or artist contains every word typed so far, best matches first. */
export function searchSongs(songs: SonglessSong[], query: string, limit = 5): SonglessSong[] {
  const words = normalizeSongText(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const scored: { song: SonglessSong; score: number }[] = [];
  for (const song of songs) {
    const title = normalizeSongText(song.title);
    const haystack = `${title} ${normalizeSongText(song.artist)}`;
    if (!words.every((word) => haystack.includes(word))) continue;
    // Titles that start with what was typed rank above ones that only contain it.
    scored.push({ song, score: title.startsWith(words.join(' ')) ? 0 : 1 });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.song.title.localeCompare(b.song.title))
    .slice(0, limit)
    .map((s) => s.song);
}

/** A random song that hasn't come up yet; once every song has, starts over (avoiding the one just played). */
export function pickNextSong(
  songs: SonglessSong[],
  playedIds: ReadonlySet<string>,
  lastId?: string,
  random: () => number = Math.random,
): SonglessSong | undefined {
  const fresh = songs.filter((song) => !playedIds.has(song.id));
  const pool = fresh.length > 0 ? fresh : songs.filter((song) => song.id !== lastId);
  const from = pool.length > 0 ? pool : songs;
  return from[Math.floor(random() * from.length)];
}

/** The round after one more try: a right pick wins, and a wrong pick or a skip uses a try, losing after the last one. */
export function applySonglessTry(
  answer: SonglessSong,
  attempts: SonglessAttempt[],
  picked: SonglessSong | null,
): { attempts: SonglessAttempt[]; status: SonglessRoundStatus } {
  if (picked && isCorrectGuess(answer, picked)) return { attempts, status: 'won' };
  const next: SonglessAttempt[] = [...attempts, picked ? { kind: 'wrong', song: picked } : { kind: 'skip' }];
  return { attempts: next, status: next.length >= SONGLESS_CLIP_SECONDS.length ? 'lost' : 'guessing' };
}
