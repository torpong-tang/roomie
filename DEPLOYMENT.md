# Roomie Deployment Runbook

This runbook introduces the API/VPS pilot without replacing the working Roomie
production service in one step. Keep the current deployment available until both
frontends pass end-to-end booking, cancellation, admin and upload tests.

## 1. Required infrastructure

1. Use the existing TLS gateway `https://2startup.cloud/roomie/api/*` for the pilot.
   A dedicated API hostname is optional and must not be enabled before its DNS and
   certificate are ready.
2. Create a dedicated PostgreSQL database and login:

```bash
sudo -u postgres createuser --pwprompt roomie_app
sudo -u postgres createdb --owner=roomie_app db_roomie
sudo -u postgres psql --dbname=db_roomie --command='CREATE EXTENSION IF NOT EXISTS btree_gist;'
```

3. Create persistent storage:

```bash
install -d -m 0750 -o root -g root /var/lib/2startup/roomie/uploads
```

Replace ownership with the non-root account used by the Roomie API process before
starting it. Do not make the directory world-writable.

## 2. Deployment directories and ports

Use separate working directories because root-path and `/roomie` builds have different
artifacts:

```text
/var/www/apps/roomie      -> PM2 roomie      -> 127.0.0.1:3002
/var/www/apps/roomie-api  -> PM2 roomie-api  -> 127.0.0.1:3102
```

Both checkouts use the same Git commit. The API checkout alone receives production
database, auth and storage secrets. Environment files must be mode `0600` and excluded
from Git.

## 3. Environment profiles

- local: copy `.env.local.example`
- Hostinger web: copy `.env.hostinger.example`
- Vercel: configure the variables from `.env.vercel.example`
- VPS API: copy `.env.api.example`

The VPS API profile must include:

```env
ROOMIE_API_ONLY=1
ROOMIE_COOKIE_PATH=/
ROOMIE_COOKIE_SAME_SITE=lax
ROOMIE_CORS_ORIGINS="https://2startup-roomie.vercel.app,https://2startup.cloud"
```

Keep the allowlist synchronized with the active Vercel production alias. Do not use
`*` with credentialed requests. An origin that is missing from this list fails with
`403 {"error":"Origin is not allowed"}` on sign-in while `GET /api/health` still
returns `200`, because browsers omit `Origin` on same-origin GET requests.

During a domain cutover, add the new origin **before** switching and keep the retired
one until the new frontend passes the release gate. Remove the retired origin in a
separate step so a rollback never requires an API restart.

Generate independent high-entropy values for every production secret. Never reuse a
local password, commit `.env`, or paste credentials into a deployment log.

## 4. Migrate existing production data

Do this during a maintenance window. Do not point two writable databases at production.

1. Back up the current PostgreSQL database and uploads.
2. Restore into an empty `db_roomie` with `--no-owner --no-acl`.
3. Run `npm ci`, `npm run db:generate`, then `npm run db:migrate` in `roomie-api`.
4. Compare counts for `AppUser`, `Place`, `Room`, `Booking` and `_prisma_migrations`.
5. Copy uploads with metadata preserved, then compare file count and total bytes.
6. Keep the former database read-only and unchanged through the rollback window.

Never use `prisma db push`, `migrate reset`, or demo seed scripts in production.

## 5. Build and start API

```bash
cd /var/www/apps/roomie-api
git pull --ff-only
npm ci
npm run db:generate
npm run db:migrate
NEXT_PUBLIC_BASE_PATH=/ npm run build
PORT=3102 HOSTNAME=127.0.0.1 node .next/standalone/server.js
```

Run the final command through the dedicated PM2 process `roomie-api`; do not restart
other apps. Verify locally before enabling public routing:

```bash
curl --fail --silent http://127.0.0.1:3102/api/health
```

### Where the API reads its environment

Three copies of the same values exist, and they can drift:

```text
/var/www/apps/roomie-api/.env                    source of truth, edited by hand
/var/www/apps/roomie-api/.next/standalone/.env   what the running process loads
PM2's saved process environment                  overrides both
```

The standalone `server.js` calls `process.chdir(__dirname)`, so it loads `.env` from
the standalone directory, not from the checkout root. `next build` copies the root
`.env` into the standalone output, which keeps the two in step as long as every change
is made in the root file and followed by a build.

PM2 is the part that surprises. Values already present in `process.env` are never
overwritten by the env file, and `pm2 restart --update-env` refreshes them from the
shell that runs the command, not from any file. Editing an env file and restarting
therefore appears to succeed while the process keeps serving the old value.

Change an environment value like this:

```bash
cd /var/www/apps/roomie-api
# edit .env, then propagate it to the standalone copy
cp -p .env .next/standalone/.env
chmod 600 .next/standalone/.env
set -a && . ./.next/standalone/.env && set +a
PORT=3102 HOSTNAME=127.0.0.1 pm2 restart roomie-api --update-env
pm2 save
```

Confirm the running process actually took the value, rather than trusting the file:

```bash
tr '\0' '\n' < /proc/$(pm2 pid roomie-api)/environ | grep '^ROOMIE_CORS_ORIGINS='
```

Back the env files up outside `.next/` before any build, because a failed build can
leave the standalone directory incomplete:

```bash
install -d -m 0700 /root/roomie-env-backup
cp -p .next/standalone/.env /root/roomie-env-backup/roomie-api.env.$(date -u +%Y%m%dT%H%M%SZ)
```

## 6. Nginx routing

The existing `2startup.cloud` server proxies only to `127.0.0.1:3102`. Place this
location before the general `/roomie/` location:

```nginx
location ^~ /roomie/api/ {
    rewrite ^/roomie/api/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:3102;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Validate before reload:

```bash
nginx -t
systemctl reload nginx
```

## 7. Vercel

Connect `torpong-tang/roomie` to one Vercel project and set only the variables in
`.env.vercel.example`. Git integration should deploy automatically. Do not add
production database or auth secrets to the frontend project.

The current production frontend is `https://2startup-roomie.vercel.app`. The former
alias `https://roomie-iota-beryl.vercel.app` is retired; see "Retire a Vercel alias"
below. If the Vercel project is renamed or assigned another production domain, update
`ROOMIE_CORS_ORIGINS` on the VPS API and restart only `roomie-api --update-env` before
testing login. Changing the Vercel domain alone does not require a frontend redeploy:
the rewrite target and base path are unchanged, and only the API allowlist decides
whether sign-in succeeds.

`npm run build` detects `VERCEL=1`, excludes the VPS-only Next API routes from the
frontend artifact and its server-only Prisma/auth helper files, clears stale `.next`
route types, skips Prisma generation and VPS standalone packaging, uses root path `/`,
and rewrites `/api/*` to
`https://2startup.cloud/roomie` by default. The two public environment variables in
`.env.vercel.example` remain recommended because they make the deployment intent
explicit and allow the API gateway to be changed without a source-code release.

The Vercel frontend build must succeed even when package install scripts are disabled;
it does not require a generated Prisma client. Prisma generation and standalone
packaging remain mandatory for the VPS full-stack/API build.

Do not connect this repository to duplicate Vercel projects. Keep the project whose
production domain is `2startup-roomie.vercel.app` after it passes the release gate,
then disconnect any duplicate from Git only after confirming that it serves no
production traffic.

If Vercel reports Prisma errors while collecting API route data, verify that the
deployment uses the latest commit and that the build log contains:

```text
Building Roomie frontend-only deployment for Vercel.
```

The Vercel project must not define `DATABASE_URL`, `DIRECT_URL`,
`ROOMIE_AUTH_SECRET`, `ROOMIE_ACCESS_CODE`, or upload-storage credentials.

If the browser reports `Unexpected token '<'` while reading JSON, inspect the failing
`/api/*` response. It means a redirect/error HTML page reached the frontend instead
of the API JSON contract. Confirm the rewrite target, verify that `/api/health` and
`/api/auth/me` return `application/json`, check the active Vercel alias in the CORS
allowlist, and redeploy to clear stale rewrite metadata. Roomie API GET requests use
`no-store` plus a revision query to avoid reusing legacy permanent redirects.

### Retire a Vercel alias

Run this only after the new frontend passes the release gate. Sign-in breaks the
moment an active origin leaves the allowlist, so the retired origin is removed in its
own step.

1. Confirm the new origin is accepted and the retired one is no longer in use:

```bash
for origin in https://2startup-roomie.vercel.app https://roomie-iota-beryl.vercel.app; do
  printf '%s -> ' "$origin"
  curl --silent --output /dev/null --write-out '%{http_code}\n' \
    --request POST --header 'Content-Type: application/json' \
    --header "Origin: $origin" --data '{"email":"probe@example.invalid","accessCode":"x"}' \
    "$origin/api/auth/login"
done
```

`401` means the origin reaches the sign-in logic and the probe credentials were
rejected, which is the expected healthy result. `403` means the origin is blocked by
the allowlist.

2. Remove the retired origin from `ROOMIE_CORS_ORIGINS` in the API environment file,
   then restart only the Roomie API:

```bash
pm2 restart roomie-api --update-env
pm2 save
```

3. Re-run the probe. The retired origin must now return `403` and the production
   origin must still return `401`.
4. Remove the alias in the Vercel project so the retired hostname stops serving a
   frontend that can no longer sign in. Do not delete the project itself while it
   holds the production domain.

`https://2startup.cloud/roomie` is unaffected by any of this. It reaches the same API
through the Nginx `/roomie/api/` proxy and its origin entry never changes.

## 8. Release gate

Before directing users to the pilot, verify:

- API health is `200` and database reports `reachable`.
- Admin, place and viewer login work from both frontend URLs.
- Admin place/room management works and viewers remain read-only.
- Booking collision protection works under concurrent requests.
- Upload, authenticated image display and cancellation work from both URLs.
- Browser console has no CORS, cookie or mixed-content errors.
- PostgreSQL and upload backups can be restored together.
- Existing PM2 apps and their public health checks remain unchanged.

If any gate fails, remove the new frontend proxy/rewrite and keep the existing Roomie
service active. Roll back only `roomie`/`roomie-api`; never restart unrelated processes.

## 9. Automated backup and restore drill

Production runs `/usr/local/sbin/backup-roomie` daily from
`/etc/cron.d/roomie-backup`. Each snapshot is stored under
`/var/backups/2startup/roomie`, contains a custom-format PostgreSQL dump, the
persistent uploads directory and SHA-256 checksums, and is readable by root only.
The default retention is 14 days.

Verify the most recent snapshot and perform a restore drill after database schema or
storage changes. Restore into a temporary database, compare `AppUser`, `Place`,
`Room`, and `Booking` counts, validate the uploads archive with `tar -tzf`, then drop
the temporary database. A backup is not considered valid until this drill succeeds.
