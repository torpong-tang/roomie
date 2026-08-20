import { existsSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const apiDirectory = path.join(projectRoot, 'src', 'app', 'api');
const apiBackupDirectory = path.join(projectRoot, '.roomie-api-build-backup');
const isVercelFrontendBuild = process.env.VERCEL === '1';

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
};

if (existsSync(apiBackupDirectory)) {
  throw new Error(
    'A stale .roomie-api-build-backup directory exists. Restore src/app/api before building.',
  );
}

try {
  run('npx', ['prisma', 'generate']);

  if (isVercelFrontendBuild) {
    console.log('Building Roomie frontend-only deployment for Vercel.');
    renameSync(apiDirectory, apiBackupDirectory);
  }

  if (!process.exitCode) run('npx', ['next', 'build']);
} finally {
  if (existsSync(apiBackupDirectory)) {
    renameSync(apiBackupDirectory, apiDirectory);
  }
}

if (process.exitCode) process.exit(process.exitCode);
