import { readFile } from 'fs/promises';
import path from 'path';

const seedTypesPath = () => path.join(process.cwd(), 'public', 'seed', 'customTypes.json');
const seedPromptsPath = () => path.join(process.cwd(), 'public', 'seed', 'customPrompts.json');

export async function loadSeedTypes() {
  try {
    const raw = await readFile(seedTypesPath(), 'utf8');
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export async function loadSeedPrompts() {
  try {
    const raw = await readFile(seedPromptsPath(), 'utf8');
    const j = JSON.parse(raw);
    return j && typeof j === 'object' && j !== null ? j : {};
  } catch {
    return {};
  }
}

/** @param {string} id */
export async function loadSeedTypeById(id) {
  const types = await loadSeedTypes();
  return types.find((t) => t && t.id === id) ?? null;
}
