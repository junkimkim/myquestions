/**
 * ChunkLoadError / `Cannot find module './NNN.js'` / HMR 청크 오류 시:
 * `npm run dev:clean` 으로 캐시 삭제 후 dev 재시작.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const nextDir = path.join(root, '.next');
const webpackCache = path.join(root, 'node_modules', '.cache');

function rmQuiet(p, label) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`[clean-next-cache] removed ${label}`);
  } catch (e) {
    console.warn('[clean-next-cache]', label, e?.message || e);
  }
}

rmQuiet(nextDir, '.next');
rmQuiet(webpackCache, 'node_modules/.cache');
