import { resolve, sep } from 'path';

/**
 * Uploads must live outside `public/`: the standalone postbuild step wipes and
 * re-copies `public/`, which would delete every image uploaded since the last build.
 * Point ROOMIE_UPLOAD_DIR at a persistent directory in production.
 */
export const UPLOAD_DIR = process.env.ROOMIE_UPLOAD_DIR
    ? resolve(process.env.ROOMIE_UPLOAD_DIR)
    : resolve(process.cwd(), 'var', 'uploads');

export const UPLOAD_URL_PREFIX = '/api/uploads';

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(jpg|png|webp|gif)$/;

export const contentTypeForFile = (filename: string) => {
    const dot = filename.lastIndexOf('.');
    return EXTENSION_CONTENT_TYPES[filename.slice(dot).toLowerCase()] || 'application/octet-stream';
};

/** Returns an absolute path inside UPLOAD_DIR, or null when the name is not safe. */
export const resolveUploadPath = (filename: string) => {
    if (!SAFE_FILENAME.test(filename) || filename.includes('..')) return null;
    const target = resolve(UPLOAD_DIR, filename);
    if (target !== UPLOAD_DIR && !target.startsWith(`${UPLOAD_DIR}${sep}`)) return null;
    return target;
};
