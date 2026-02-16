import { sql } from './db-client';
import { transformMusicTrack } from './db-transforms';

export async function createMusicTrack({ name, gcsUrl, duration, isDefault }) {
  const result = await sql`
    INSERT INTO music_tracks (name, gcs_url, duration, is_default)
    VALUES (${name}, ${gcsUrl}, ${duration || null}, ${isDefault || false})
    RETURNING *
  `;
  return transformMusicTrack(result[0]);
}

export async function getAllMusicTracks() {
  const result = await sql`SELECT * FROM music_tracks ORDER BY is_default DESC, created_at DESC`;
  return result.map(transformMusicTrack);
}

export async function deleteMusicTrack(id) {
  await sql`DELETE FROM music_tracks WHERE id = ${id}`;
}
