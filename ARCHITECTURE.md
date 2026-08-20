# Roomie Architecture

## Pilot topology

```text
GitHub: torpong-tang/roomie
          |
          +-- Vercel frontend: roomie-iota-beryl.vercel.app
          |      `-- /api/* rewrite to ------------------+
          |                                              |
          +-- Hostinger frontend: 2startup.cloud/roomie  |
                 `-- Nginx /roomie/api/* ----------------+
                                             |
                                      roomie-api:3102
                                             |
                              +--------------+--------------+
                              |                             |
                    PostgreSQL db_roomie       Persistent uploads
                    role roomie_app            /var/lib/2startup/
                                               roomie/uploads
```

The browser uses a same-origin `/api/*` URL on both frontends. Vercel rewrites and
Nginx proxies those requests to the dedicated VPS API. This avoids third-party-cookie
failures and lets authenticated room images render through the same origin.

The pilot deliberately reuses the existing `2startup.cloud` TLS certificate and
publishes no database port. A dedicated `api-roomie.2startup.cloud` hostname may be
added later, after its DNS and certificate are provisioned. Direct API access remains
protected by the exact `ROOMIE_CORS_ORIGINS` allowlist.

## Deployment profiles

| Profile | Base path | API transport | Database/storage secrets |
| --- | --- | --- | --- |
| Local full-stack | `/roomie` | local Next API routes | local only |
| Hostinger frontend | `/roomie` | Nginx same-origin proxy | none |
| Vercel frontend | root (`/`) | Next.js same-origin rewrite | none |
| VPS API | root (`/`) | direct API process | production only |

`NEXT_PUBLIC_BASE_PATH` must be `/roomie` for Hostinger and `/` for root deployments.
Leaving it undefined preserves the legacy `/roomie` default outside Vercel. Vercel's
platform-provided `VERCEL=1` selects root path automatically and also makes the build
frontend-only: `src/app/api` is excluded from the deployment artifact, while
`/api/*` is rewritten to the VPS gateway. This keeps Prisma and all database code on
the VPS trust boundary.

## Database isolation

Roomie uses PostgreSQL-specific functionality, including the `btree_gist` extension
and an exclusion constraint that prevents overlapping bookings. MySQL is therefore
not a drop-in replacement.

Production uses a dedicated database and least-privilege login:

```text
database: db_roomie
role:     roomie_app
```

The application role must own Roomie's tables but must not be a PostgreSQL superuser
and must not have access to databases belonging to other apps.

## File ownership

Uploaded images are binary files on persistent storage. PostgreSQL stores their URL
and Room metadata only. API processes are the sole writers to:

```text
/var/lib/2startup/roomie/uploads
```

Backups must include both PostgreSQL and this directory. Restoring only one side may
leave broken image references.

## Authentication boundary

- Sessions are signed, HTTP-only cookies with a 12-hour embedded expiry.
- Same-origin frontend proxies are preferred; cross-origin mode requires an exact
  CORS allowlist and credentialed requests.
- State-changing API requests from unapproved origins are rejected by `src/proxy.ts`.
- The API session cookie uses `Path=/` so it is returned through both the Vercel
  `/api/*` rewrite and the Hostinger `/roomie/api/*` proxy.
- `ROOMIE_CORS_ORIGINS` must contain every active Vercel production alias exactly;
  adding a new Vercel project/domain requires updating this allowlist before login.
- The frontend must never receive `DATABASE_URL`, `DIRECT_URL`, admin access codes or
  the auth signing secret.
