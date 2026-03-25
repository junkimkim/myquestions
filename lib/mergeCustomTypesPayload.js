import { defaultCustomPromptForKind, getTypeKind } from '@/lib/defaultPrompts';

function okSeedTypes(a) {
  return Array.isArray(a)
    ? a.filter((x) => x && typeof x.id === 'string' && typeof x.name === 'string')
    : [];
}

/**
 * @param {unknown} seedTypes
 * @param {Record<string, string>} seedPromptsObj
 * @param {Array<{ id: string, name: string, description?: string, kind?: string, prompt?: string }>} dbRows
 * @param {string[]} removedTypeIds
 */
export function mergeTypesAndPrompts(seedTypes, seedPromptsObj, dbRows, removedTypeIds) {
  const removed = new Set(removedTypeIds);
  const seedList = okSeedTypes(seedTypes).filter((t) => !removed.has(t.id));
  const dbMap = new Map((dbRows || []).map((r) => [r.id, r]));
  const seedIdSet = new Set(seedList.map((t) => t.id));

  const types = [];
  const prompts = {};

  for (const t of seedList) {
    const row = dbMap.get(t.id);
    if (row) {
      const k = row.kind || 'mcq';
      types.push({
        id: row.id,
        name: row.name,
        desc: row.description ?? '',
        kind: k,
        mcq_category: row.mcq_category ?? null,
        is_descriptive: row.is_descriptive ?? false,
      });
      prompts[row.id] = row.prompt || defaultCustomPromptForKind(k);
    } else {
      const k = getTypeKind(t);
      types.push({
        id: t.id,
        name: t.name,
        desc: t.desc || '',
        kind: k,
        is_descriptive: Boolean(t.is_descriptive ?? t.is_descriptive_answer ?? false),
      });
      prompts[t.id] = seedPromptsObj[t.id] ?? defaultCustomPromptForKind(k);
    }
  }

  for (const row of dbRows || []) {
    if (!seedIdSet.has(row.id)) {
      const k = row.kind || 'mcq';
      types.push({
        id: row.id,
        name: row.name,
        desc: row.description ?? '',
        kind: k,
        mcq_category: row.mcq_category ?? null,
        is_descriptive: row.is_descriptive ?? false,
      });
      prompts[row.id] = row.prompt || defaultCustomPromptForKind(k);
    }
  }

  return { types, prompts };
}
