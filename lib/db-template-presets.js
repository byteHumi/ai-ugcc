import { sql } from './db-client';
import { transformTemplatePreset } from './db-transforms';

export async function createTemplatePreset({ name, description, pipeline }) {
  const result = await sql`
    INSERT INTO template_presets (name, description, pipeline)
    VALUES (${name}, ${description || null}, ${JSON.stringify(pipeline)})
    RETURNING *
  `;
  return transformTemplatePreset(result[0]);
}

export async function getAllTemplatePresets() {
  const result = await sql`SELECT * FROM template_presets ORDER BY updated_at DESC`;
  return result.map(transformTemplatePreset);
}

export async function updateTemplatePreset(id, updates) {
  const { name, description, pipeline } = updates;
  const result = await sql`
    UPDATE template_presets SET
      name = COALESCE(${name || null}, name),
      description = COALESCE(${description !== undefined ? description : null}, description),
      pipeline = COALESCE(${pipeline ? JSON.stringify(pipeline) : null}, pipeline),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] ? transformTemplatePreset(result[0]) : null;
}

export async function deleteTemplatePreset(id) {
  await sql`DELETE FROM template_presets WHERE id = ${id}`;
}
