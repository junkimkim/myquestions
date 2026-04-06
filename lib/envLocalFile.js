/**
 * 프로젝트 루트 `.env.local` 읽기/쓰기 (토스 키 등).
 * 서버 전용 — 클라이언트에 import 금지.
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

/** 파일 변경 후 `process.env` 갱신 전에도 키를 쓰기 위해 동기 읽기 + mtime 캐시 */
let syncCacheMtime = null;
let syncCacheParsed = null;

export const ENV_LOCAL_FILENAME = '.env.local';

export const TOSS_ENV_KEYS = {
  client: 'NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY',
  secret: 'TOSS_PAYMENTS_SECRET_KEY',
  security: 'TOSS_PAYMENTS_SECURITY_KEY',
};

function envLocalPath() {
  return path.join(process.cwd(), ENV_LOCAL_FILENAME);
}

/**
 * @returns {Promise<string>}
 */
export async function readEnvLocalFile() {
  try {
    return await fsPromises.readFile(envLocalPath(), 'utf8');
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
      return '';
    }
    throw e;
  }
}

/**
 * 동기 파싱 (토스 키 폴백용). 파일이 바뀌면 캐시 무효화.
 * @returns {Record<string, string> | null}
 */
export function getParsedEnvLocalFromDiskSync() {
  try {
    const p = envLocalPath();
    if (!fs.existsSync(p)) {
      syncCacheParsed = null;
      syncCacheMtime = null;
      return null;
    }
    const st = fs.statSync(p);
    const mtime = st.mtimeMs;
    if (syncCacheParsed != null && syncCacheMtime === mtime) {
      return syncCacheParsed;
    }
    const content = fs.readFileSync(p, 'utf8');
    syncCacheParsed = parseEnvLocal(content);
    syncCacheMtime = mtime;
    return syncCacheParsed;
  } catch (e) {
    console.warn('[envLocalFile] .env.local 읽기 실패 — process.env 폴백으로 전환합니다.', e?.code ?? e);
    return null;
  }
}

/** `.env.local` 저장 직후 같은 프로세스에서 폴백이 즉시 보이도록 캐시 무효화 */
export function invalidateEnvLocalSyncCache() {
  syncCacheMtime = null;
  syncCacheParsed = null;
}

/**
 * 단순 KEY=VALUE 파서 (주석·빈 줄 무시, 따옴표 제거).
 * @returns {Record<string, string>}
 */
export function parseEnvLocal(content) {
  const out = {};
  if (!content) return out;
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    out[key] = val;
  }
  return out;
}

function escapeEnvValue(val) {
  const s = String(val);
  if (s === '') return '';
  if (/[\r\n"#]/.test(s) || /^\s/.test(s) || /\s$/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}"`;
  }
  return s;
}

/**
 * 기존 내용에 대해 지정 키만 갱신하거나 줄 삭제(값이 빈 문자열이면 해당 KEY 줄 제거).
 * @param {string} content
 * @param {Record<string, string>} updates
 */
export function upsertEnvLocalContent(content, updates) {
  const keys = Object.keys(updates);
  const lines = content === '' ? [] : content.split(/\r?\n/);
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      result.push(line);
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      result.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.includes(key)) {
      seen.add(key);
      const val = updates[key];
      if (val === undefined || val === '') {
        // 줄 삭제
      } else {
        result.push(`${key}=${escapeEnvValue(val)}`);
      }
    } else {
      result.push(line);
    }
  }

  for (const key of keys) {
    if (seen.has(key)) continue;
    const val = updates[key];
    if (val !== undefined && val !== '') {
      result.push(`${key}=${escapeEnvValue(val)}`);
    }
  }

  const joined = result.join('\n');
  return joined.endsWith('\n') || joined === '' ? joined : `${joined}\n`;
}

/**
 * @param {Record<string, string>} updates
 */
export async function writeEnvLocalWithUpdates(updates) {
  const content = await readEnvLocalFile();
  const next = upsertEnvLocalContent(content, updates);
  await fsPromises.writeFile(envLocalPath(), next, 'utf8');
  invalidateEnvLocalSyncCache();
}

/**
 * 토스 관련 키 줄만 `.env.local` 에서 제거합니다.
 */
export async function removeTossKeysFromEnvLocal() {
  const empty = {
    [TOSS_ENV_KEYS.client]: '',
    [TOSS_ENV_KEYS.secret]: '',
    [TOSS_ENV_KEYS.security]: '',
  };
  const content = await readEnvLocalFile();
  const next = upsertEnvLocalContent(content, empty);
  await fsPromises.writeFile(envLocalPath(), next, 'utf8');
  invalidateEnvLocalSyncCache();
}

/**
 * @param {string} content
 */
export function getTossKeysStatusFromParsed(parsed) {
  const c = TOSS_ENV_KEYS.client;
  const s = TOSS_ENV_KEYS.secret;
  const sec = TOSS_ENV_KEYS.security;
  return {
    hasClientKey: Boolean(parsed[c]?.trim()),
    hasSecretKey: Boolean(parsed[s]?.trim()),
    hasSecurityKey: Boolean(parsed[sec]?.trim()),
  };
}
