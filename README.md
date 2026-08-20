# Roomie

Meeting room booking for multiple places (branches), built with Next.js 16, Prisma and PostgreSQL.
The same repository supports three deployment profiles:

- local/full-stack at `http://localhost:3002/roomie`
- Hostinger frontend at `https://2startup.cloud/roomie`
- Vercel frontend at `https://roomie.vercel.app`

The two production frontends use the same dedicated API, PostgreSQL database and
persistent upload directory. See `ARCHITECTURE.md` and `DEPLOYMENT.md` before changing
production infrastructure.

## Access model

Roomie has three kinds of sign-in, all through the same form:

| Sign-in | Identifier | Access code | Can do |
| --- | --- | --- | --- |
| Administrator | Email in `AppUser` | Shared `ROOMIE_ACCESS_CODE` | Everything, across all places |
| Place | Place key (e.g. `stw@swp`) | Place access code | Book and cancel within its own place |
| Viewer | The same place key | Place **view code** (optional) | Read the calendar and agenda for that place — nothing else |

Both place codes are scrypt-hashed and must differ from each other and from the admin
code. An administrator sets or removes a place's view code from the Access page;
removing it immediately invalidates the sessions it handed out.

Viewers see only the calendar page. History, Insights, Rooms and Access are hidden from
the navigation, blocked if opened directly, and every booking mutation returns 403 for
them regardless of what the browser sends.

## Getting started

```bash
npm install
cp .env.local.example .env       # then fill in local-only values
npm run db:generate              # generate the Prisma client
npm run db:migrate               # apply migrations
npm run db:seed-users            # create the first administrator
npm run dev                      # http://localhost:3002/roomie
```

To run an isolated local PostgreSQL container first:

```bash
export ROOMIE_DB_PASSWORD='<LOCAL-ONLY-PASSWORD>'
docker compose -f docker-compose.dev.yml up -d
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3002 |
| `npm run build` / `npm start` | Standalone production build and server |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed-users` | Upsert the administrator accounts listed in `scripts/seed-app-users.mjs` |
| `npm run db:check` | Print connection details and a summary of the data |
| `npm run db:migrate-uploads` | One-off: move legacy `public/uploads` images to `ROOMIE_UPLOAD_DIR` |

## Data model

- **Place** — a branch or site, with its own access code. Everything else is scoped to a place.
- **Room** — a bookable meeting room belonging to a place.
- **Booking** — a reservation. A Postgres exclusion constraint (`Booking_no_overlap`)
  makes it impossible for two bookings of the same room to overlap, even under
  concurrent requests.
- **AppUser** — an administrator account.

Each environment must use its own PostgreSQL database. Local development must never
connect to the production database.

## Uploads

Room images are written to `ROOMIE_UPLOAD_DIR` (default `./var/uploads`) and served by
the authenticated `/api/uploads/<filename>` route. They must not live under `public/`:
the `postbuild` step deletes and re-copies `public/` into the standalone output, which
would erase every image uploaded since the last build.

## Health check

`GET /api/health` verifies that the API process and PostgreSQL connection are ready.
It does not expose credentials or application records.
