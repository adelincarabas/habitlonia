import { normalizeSongText, parseSpotifyPlaylistId, SonglessSong, type SonglessPlaylist } from '@habitlonia/shared';
import { z } from 'zod';
import { db } from './db';

// Playlists are read from Spotify's public embed player (the one websites show), which lists a
// playlist's songs with their 30s previews to anyone. Spotify's Web API needs each user to log in
// and only shares playlists they own, so it can't take a pasted link. The embed shows the first 100 songs.
const SPOTIFY_EMBED = 'https://open.spotify.com/embed/playlist';
// The few songs without a Spotify preview are matched to the same song on Deezer, whose public API has them too.
const DEEZER = 'https://api.deezer.com';

const EmbedTrack = z.object({
  uri: z.string(),
  title: z.string(),
  subtitle: z.string(),
  entityType: z.string().optional(),
  audioPreview: z.object({ url: z.string() }).nullish(),
});
const EmbedPlaylist = z.object({ name: z.string(), trackList: z.array(z.unknown()) });

const DeezerTrack = z.object({
  id: z.number(),
  title: z.string(),
  /** The title without its "(2019 Mix)" style version. */
  title_short: z.string().optional(),
  readable: z.boolean().optional(),
  preview: z.string(),
  artist: z.object({ name: z.string() }),
});
type DeezerTrack = z.infer<typeof DeezerTrack>;

type PlaylistRow = { name: string; songs: string; skipped: number };

const selectPlaylist = db.prepare('SELECT name, songs, skipped FROM songless_playlists WHERE user_id = ?');
const upsertPlaylist = db.prepare(
  `INSERT INTO songless_playlists (user_id, name, songs, skipped, updated_at) VALUES (?, ?, ?, ?, ?)
   ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, songs = excluded.songs,
     skipped = excluded.skipped, updated_at = excluded.updated_at`,
);

export function getSonglessPlaylist(userId: string): SonglessPlaylist | null {
  const row = selectPlaylist.get(userId) as PlaylistRow | undefined;
  if (!row) return null;
  // A playlist saved in an older shape is treated as none, so the user just pastes the link again.
  const songs = z.array(SonglessSong).safeParse(JSON.parse(row.songs));
  return songs.success ? { name: row.name, songs: songs.data, skipped: row.skipped } : null;
}

export class PlaylistNotFoundError extends Error {}

/** Reads the playlist behind a shared link and saves the songs that have a preview, replacing the previous one. */
export async function importSonglessPlaylist(userId: string, link: string): Promise<SonglessPlaylist> {
  const playlist = await fetchEmbedPlaylist(parseSpotifyPlaylistId(link)!);

  const tracks = playlist.trackList.flatMap((item) => {
    const track = EmbedTrack.safeParse(item);
    // Podcast episodes can be in playlists too; only songs make sense here.
    if (!track.success || (track.data.entityType && track.data.entityType !== 'track')) return [];
    const id = track.data.uri.split(':').pop()!;
    return [{ id, title: track.data.title, artist: track.data.subtitle, preview: track.data.audioPreview?.url }];
  });

  const previews = await mapLimit(tracks, 4, async (track) => {
    if (track.preview) return track.preview;
    const match = await findDeezerPreview(track.title, track.artist);
    return match ? `/songless/preview/${match.id}` : null;
  });

  const seen = new Set<string>();
  const songs: SonglessSong[] = [];
  tracks.forEach((track, i) => {
    const previewUrl = previews[i];
    if (!previewUrl || seen.has(track.id)) return;
    seen.add(track.id);
    songs.push({ id: track.id, title: track.title, artist: track.artist, previewUrl });
  });

  const result: SonglessPlaylist = { name: playlist.name, songs, skipped: tracks.length - songs.length };
  if (songs.length > 0) {
    upsertPlaylist.run(userId, result.name, JSON.stringify(songs), result.skipped, new Date().toISOString());
  }
  return result;
}

/** The embed page carries its data as JSON in a __NEXT_DATA__ script tag. Private or deleted playlists have none. */
async function fetchEmbedPlaylist(playlistId: string): Promise<z.infer<typeof EmbedPlaylist>> {
  const res = await fetch(`${SPOTIFY_EMBED}/${playlistId}`, {
    // Without a browser user agent Spotify serves a page without the data.
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' },
  });
  const html = res.ok ? await res.text() : '';
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
  let entity: unknown;
  try {
    entity = json && JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
  } catch {
    entity = undefined;
  }
  const playlist = EmbedPlaylist.safeParse(entity);
  if (!playlist.success) {
    throw new PlaylistNotFoundError("Couldn't open that playlist. Make sure it's public on Spotify.");
  }
  return playlist.data;
}

/** Album covers for the reveal, looked up only when a song is revealed, via Spotify's public oEmbed. */
const artworkCache = new Map<string, string | null>();

export async function getArtworkUrl(trackId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9]{22}$/.test(trackId)) return null;
  if (artworkCache.has(trackId)) return artworkCache.get(trackId)!;

  let url: string | null = null;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
    if (res.ok) url = z.object({ thumbnail_url: z.string() }).parse(await res.json()).thumbnail_url;
  } catch {
    url = null;
  }
  artworkCache.set(trackId, url);
  return url;
}

/** Searches Deezer by title and artist, so remixes, live versions and same-named songs don't sneak in. */
async function findDeezerPreview(trackTitle: string, trackArtist: string): Promise<DeezerTrack | null> {
  const title = normalizeSongText(trackTitle);
  // Spotify joins several artists with commas; the first one is enough to search by.
  const artist = normalizeSongText(trackArtist.split(',')[0]!);
  // Deezer's strict `track:"…" artist:"…"` search misses some songs that a plain one finds.
  for (const query of [`track:"${title}" artist:"${artist}"`, `${title} ${artist}`]) {
    const candidates = (await searchDeezer(query)).filter(
      (c) => hasPreview(c) && sameArtist(normalizeSongText(c.artist.name), artist),
    );
    // Prefer an exact title match over the remixes and live versions the search also returns.
    const match =
      candidates.find((c) => normalizeSongText(c.title_short ?? c.title) === title) ??
      candidates.find((c) => normalizeSongText(c.title).includes(title));
    if (match) return match;
  }
  return null;
}

async function searchDeezer(query: string): Promise<DeezerTrack[]> {
  const found = z
    .object({ data: z.array(z.unknown()) })
    .safeParse(await deezer(`/search?limit=10&q=${encodeURIComponent(query)}`));
  if (!found.success) return [];
  return found.data.data.flatMap((item) => {
    const parsed = DeezerTrack.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** "the beatles" vs "beatles", "post malone" vs "post malone swae lee". */
const sameArtist = (a: string, b: string) => a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));

const hasPreview = (track: DeezerTrack) => track.readable !== false && track.preview.length > 0;

// Deezer preview links are signed and expire, so they're never stored:
// the app asks for /songless/preview/:id and gets redirected to a fresh one.
const previewCache = new Map<string, { url: string; expiresAt: number }>();
const PREVIEW_CACHE_MS = 30 * 60 * 1000;

export async function getPreviewUrl(previewId: string): Promise<string | null> {
  if (!/^\d+$/.test(previewId)) return null;

  const cached = previewCache.get(previewId);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const track = DeezerTrack.safeParse(await deezer(`/track/${previewId}`));
  if (!track.success || !hasPreview(track.data)) return null;

  previewCache.set(previewId, { url: track.data.preview, expiresAt: Date.now() + PREVIEW_CACHE_MS });
  return track.data.preview;
}

/** GET from Deezer's API. Deezer answers errors (even rate limits) with 200 and `{ error }`. */
async function deezer(path: string, retried = false): Promise<unknown> {
  let body: { error?: { code?: number } } | null;
  try {
    const res = await fetch(`${DEEZER}${path}`);
    if (!res.ok) return null;
    body = await res.json();
  } catch {
    return null;
  }
  // Code 4 is "quota exceeded" (Deezer allows 50 requests per 5 seconds): wait it out once.
  if (body?.error?.code === 4 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return deezer(path, true);
  }
  return body?.error ? null : body;
}

/** Like Promise.all(items.map(fn)), but with at most `limit` calls in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
