import { describe, expect, it } from 'vitest';
import { parseSpotifyPlaylistId, type SonglessSong } from '../types';
import { applySonglessTry, isCorrectGuess, normalizeSongText, pickNextSong, searchSongs } from './songless';

const song = (id: string, title: string, artist: string): SonglessSong => ({ id, title, artist, previewUrl: id });

const songs = [
  song('1', 'Here Comes the Sun - Remastered 2009', 'The Beatles'),
  song('2', 'Sunflower (feat. Swae Lee)', 'Post Malone'),
  song('3', 'Señorita', 'Shawn Mendes'),
  song('4', 'Walking on Sunshine', 'Katrina & The Waves'),
];

describe('songless', () => {
  it('normalizes away accents, features and remaster tails', () => {
    expect(normalizeSongText('Señorita')).toBe('senorita');
    expect(normalizeSongText('Sunflower (feat. Swae Lee)')).toBe('sunflower');
    expect(normalizeSongText('Here Comes the Sun - Remastered 2009')).toBe('here comes the sun');
  });

  it('searches titles and artists, title prefixes first', () => {
    expect(searchSongs(songs, 'sun').map((s) => s.id)).toEqual(['2', '1', '4']);
    expect(searchSongs(songs, 'beatles sun').map((s) => s.id)).toEqual(['1']);
    expect(searchSongs(songs, 'senor').map((s) => s.id)).toEqual(['3']);
    expect(searchSongs(songs, '   ')).toEqual([]);
  });

  it('accepts the same song saved twice in the playlist', () => {
    expect(isCorrectGuess(songs[0]!, song('9', 'Here Comes The Sun', 'The Beatles'))).toBe(true);
    expect(isCorrectGuess(songs[0]!, songs[1]!)).toBe(false);
  });

  it('plays every song once before repeating, and never the same one twice in a row', () => {
    expect(pickNextSong(songs, new Set(['1', '2', '3']), '3')?.id).toBe('4');
    const again = pickNextSong(songs, new Set(['1', '2', '3', '4']), '4', () => 0.99);
    expect(again?.id).toBe('3');
    expect(pickNextSong([], new Set())).toBeUndefined();
  });

  it('wins on the right pick and loses once every try is used', () => {
    expect(applySonglessTry(songs[0]!, [], songs[0]!)).toEqual({ attempts: [], status: 'won' });
    expect(applySonglessTry(songs[0]!, [], songs[1]!)).toEqual({
      attempts: [{ kind: 'wrong', song: songs[1] }],
      status: 'guessing',
    });
    const fiveSkips = Array.from({ length: 5 }, () => ({ kind: 'skip' as const }));
    expect(applySonglessTry(songs[0]!, fiveSkips, null).status).toBe('lost');
  });
});

describe('parseSpotifyPlaylistId', () => {
  it('reads the id from the links Spotify shares', () => {
    const id = '37i9dQZF1DXcBWIGoYBM5M';
    expect(parseSpotifyPlaylistId(`https://open.spotify.com/playlist/${id}?si=abc123`)).toBe(id);
    expect(parseSpotifyPlaylistId(`https://open.spotify.com/intl-es/playlist/${id}`)).toBe(id);
    expect(parseSpotifyPlaylistId(`spotify:playlist:${id}`)).toBe(id);
    expect(parseSpotifyPlaylistId(`https://open.spotify.com/album/${id}`)).toBeNull();
    expect(parseSpotifyPlaylistId('hello')).toBeNull();
  });
});
