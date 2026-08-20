import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const apiDirectory = path.join(projectRoot, 'src', 'app', 'api');
const apiBackupDirectory = path.join(projectRoot, '.roomie-api-build-backup');
const serverLibBackupDirectory = path.join(projectRoot, '.roomie-server-lib-build-backup');
const serverLibFiles = [
  'auth.ts',
  'places.ts',
  'prisma.ts',
  'rate-limit.ts',
  'roomie-bootstrap.ts',
  'uploads.ts',
];
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

if (existsSync(apiBackupDirectory) || existsSync(serverLibBackupDirectory)) {
  throw new Error(
    'A stale Roomie build backup exists. Restore the API and server library files before building.',
  );
}

try {
  if (isVercelFrontendBuild) {
    console.log('Building Roomie frontend-only deployment for Vercel.');
    // Vercel hosts this project at `/`; a stale project-level environment
    // value must not make the client request `/roomie/*` assets or APIs.
    process.env.NEXT_PUBLIC_BASE_PATH = '';
    // Vercel can restore .next from a previous full-stack build. Remove stale
    // route types before hiding the VPS-only API tree from the frontend build.
    rmSync(path.join(projectRoot, '.next'), { recursive: true, force: true });
    renameSync(apiDirectory, apiBackupDirectory);
    mkdirSync(serverLibBackupDirectory);
    for (const fileName of serverLibFiles) {
      renameSync(
        path.join(projectRoot, 'src', 'lib', fileName),
        path.join(serverLibBackupDirectory, fileName),
      );
    }
  } else {
    run('npx', ['prisma', 'generate']);
  }

  if (!process.exitCode) run('npx', ['next', 'build']);
} finally {
  if (existsSync(apiBackupDirectory)) {
    renameSync(apiBackupDirectory, apiDirectory);
  }
  if (existsSync(serverLibBackupDirectory)) {
    for (const fileName of serverLibFiles) {
      const backupFile = path.join(serverLibBackupDirectory, fileName);
      if (existsSync(backupFile)) {
        renameSync(backupFile, path.join(projectRoot, 'src', 'lib', fileName));
      }
    }
    rmSync(serverLibBackupDirectory, { recursive: true, force: true });
  }
}

if (process.exitCode) process.exit(process.exitCode);
