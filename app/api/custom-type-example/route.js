import { access, mkdir, readdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { EXAMPLE_EXTENSIONS, EXAMPLE_PUBLIC_PREFIX, exampleDirJoin, isSafeCustomTypeId } from '@/lib/customTypeExample';

const EXAMPLES_DIR = path.join(process.cwd(), 'public', 'custom-type-examples');

async function findExistingExample(typeId) {
  for (const ext of EXAMPLE_EXTENSIONS) {
    const filePath = exampleDirJoin(process.cwd(), typeId, ext);
    try {
      await access(filePath);
      return { ext, url: `${EXAMPLE_PUBLIC_PREFIX}/${typeId}.${ext}` };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get('typeId');
  if (!isSafeCustomTypeId(typeId)) {
    return Response.json({ found: false, error: '잘못된 typeId' }, { status: 400 });
  }
  const hit = await findExistingExample(typeId);
  if (hit) return Response.json({ found: true, url: hit.url });
  return Response.json({ found: false });
}

const MIME_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function removeOtherExampleFiles(typeId, keepExt) {
  const names = await readdir(EXAMPLES_DIR).catch(() => []);
  const prefix = `${typeId}.`;
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const ext = name.slice(prefix.length).toLowerCase();
    if (ext === keepExt) continue;
    if (!EXAMPLE_EXTENSIONS.includes(ext)) continue;
    await unlink(path.join(EXAMPLES_DIR, name)).catch(() => {});
  }
}

export async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: '예시 이미지 업로드는 로컬 개발(npm run dev)에서만 가능합니다.' }, { status: 403 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'multipart 요청이 아닙니다.' }, { status: 400 });
  }

  const typeId = formData.get('typeId');
  const file = formData.get('file');

  if (!isSafeCustomTypeId(typeId)) {
    return Response.json({ error: '잘못된 typeId' }, { status: 400 });
  }

  if (!file || typeof file === 'string' || !file.size) {
    return Response.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 });
  }

  const mime = file.type || '';
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    return Response.json({ error: 'PNG, JPEG, WebP, GIF만 업로드할 수 있습니다.' }, { status: 400 });
  }

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    return Response.json({ error: '파일 크기는 8MB 이하여야 합니다.' }, { status: 400 });
  }

  await mkdir(EXAMPLES_DIR, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const outPath = exampleDirJoin(process.cwd(), typeId, ext);

  await removeOtherExampleFiles(typeId, ext);
  await writeFile(outPath, buf);

  const url = `${EXAMPLE_PUBLIC_PREFIX}/${typeId}.${ext}`;
  return Response.json({ ok: true, url, path: `public/custom-type-examples/${typeId}.${ext}` });
}

export async function DELETE(request) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: '삭제는 로컬 개발에서만 가능합니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const typeId = searchParams.get('typeId');
  if (!isSafeCustomTypeId(typeId)) {
    return Response.json({ error: '잘못된 typeId' }, { status: 400 });
  }

  const names = await readdir(EXAMPLES_DIR).catch(() => []);
  const prefix = `${typeId}.`;
  let removed = 0;
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const ext = name.slice(prefix.length).toLowerCase();
    if (!EXAMPLE_EXTENSIONS.includes(ext)) continue;
    await unlink(path.join(EXAMPLES_DIR, name)).catch(() => {});
    removed += 1;
  }

  return Response.json({ ok: true, removed });
}
