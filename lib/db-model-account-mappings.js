import { sql } from './db-client';
import { transformModelAccountMapping } from './db-transforms';

export async function createModelAccountMapping({ modelId, lateAccountId, platform }) {
  const result = await sql`
    INSERT INTO model_account_mappings (model_id, late_account_id, platform)
    VALUES (${modelId}, ${lateAccountId}, ${platform})
    ON CONFLICT (model_id, late_account_id) DO UPDATE SET platform = EXCLUDED.platform
    RETURNING *
  `;
  return transformModelAccountMapping(result[0]);
}

export async function getModelAccountMappings(modelId) {
  const result = await sql`SELECT * FROM model_account_mappings WHERE model_id = ${modelId} ORDER BY created_at ASC`;
  return result.map(transformModelAccountMapping);
}

export async function getModelAccountMappingsForModels(modelIds) {
  if (!modelIds || modelIds.length === 0) return [];
  const result = await sql`SELECT * FROM model_account_mappings WHERE model_id = ANY(${modelIds}) ORDER BY created_at ASC`;
  return result.map(transformModelAccountMapping);
}

export async function deleteModelAccountMapping(id) {
  await sql`DELETE FROM model_account_mappings WHERE id = ${id}`;
}

export async function deleteModelAccountMappingsByModel(modelId) {
  await sql`DELETE FROM model_account_mappings WHERE model_id = ${modelId}`;
}

export async function replaceModelAccountMappings(modelId, accounts) {
  await sql`DELETE FROM model_account_mappings WHERE model_id = ${modelId}`;
  const results = [];
  for (const { lateAccountId, platform } of accounts) {
    const result = await sql`
      INSERT INTO model_account_mappings (model_id, late_account_id, platform)
      VALUES (${modelId}, ${lateAccountId}, ${platform})
      RETURNING *
    `;
    results.push(transformModelAccountMapping(result[0]));
  }
  return results;
}
