import path from 'path';

export const EXAMPLE_PUBLIC_PREFIX = '/custom-type-examples';

export const EXAMPLE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

/** @param {string} typeId */
export function isSafeCustomTypeId(typeId) {
  return typeof typeId === 'string' && /^c_[a-zA-Z0-9]+$/.test(typeId);
}

/** @param {string} typeId */
export function exampleDirJoin(cwd, typeId, ext) {
  return path.join(cwd, 'public', 'custom-type-examples', `${typeId}.${ext}`);
}
