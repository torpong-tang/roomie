import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

if (process.env.VERCEL === '1') {
  console.log('Skipping VPS standalone packaging for the Vercel frontend build.');
  process.exit(0);
}

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  throw new Error('Next.js standalone output was not created.');
}

const standaloneNext = path.join(standalone, '.next');
const standaloneStatic = path.join(standaloneNext, 'static');
const standalonePublic = path.join(standalone, 'public');

mkdirSync(standaloneNext, { recursive: true });
rmSync(standaloneStatic, { recursive: true, force: true });
rmSync(standalonePublic, { recursive: true, force: true });
cpSync(path.join(root, '.next', 'static'), standaloneStatic, { recursive: true });
cpSync(path.join(root, 'public'), standalonePublic, { recursive: true });
