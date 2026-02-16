import { sql } from './db-client';
import { transformModel } from './db-transforms';

export async function createModel({ name, description, avatarUrl }) {
  const result = await sql`
    INSERT INTO models (name, description, avatar_url)
    VALUES (${name}, ${description || null}, ${avatarUrl || null})
    RETURNING *
  `;
  return transformModel(result[0]);
}

export async function getModel(id) {
  const result = await sql`SELECT * FROM models WHERE id = ${id}`;
  return result[0] ? transformModel(result[0]) : null;
}

export async function getAllModels() {
  const result = await sql`SELECT * FROM models ORDER BY created_at DESC`;
  return result.map(transformModel);
}

export async function updateModel(id, updates) {
  const { name, description, avatarUrl } = updates;
  const result = await sql`
    UPDATE models SET
      name = COALESCE(${name || null}, name),
      description = COALESCE(${description || null}, description),
      avatar_url = COALESCE(${avatarUrl || null}, avatar_url)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] ? transformModel(result[0]) : null;
}

export async function deleteModel(id) {
  await sql`DELETE FROM models WHERE id = ${id}`;
}
