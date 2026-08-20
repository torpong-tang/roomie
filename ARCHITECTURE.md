# Roomie Architecture

## Pilot topology

```text
GitHub: torpong-tang/roomie
          |
          +-- Vercel frontend: roomie.vercel.app
          |      `-- /api/* rewrite --------------------+
          |                                              |
          +-- Hostinger frontend: 2startup.cloud/roomie  |
                 `-- Nginx /roomie/api/* proxy ----------+
                                                        v
                                  api-roomie.2startup.cloud
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

Direct calls to `api-roomie.2startup.cloud` remain possible for controlled clients.
They are protected by the exact `ROOMIE_CORS_ORIGINS` allowlist.

## Deployment profiles

| Profile | Base path | API transport | Database/storage secrets |
| --- | --- | --- | --- |
| Local full-stack | `/roomie` | local Next API routes | local only |
| Hostinger frontend | `/roomie` | Nginx same-origin proxy | none |
| Vercel frontend | root (`/`) | Next.js same-origin rewrite | none |
| VPS API | root (`/`) | direct API process | production only |

`NEXT_PUBLIC_BASE_PATH` must be `/roomie` for Hostinger and `/` for root deployments.
Leaving it undefined intentionally preserves the legacy `/roomie` default.

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
- The frontend must never receive `DATABASE_URL`, `DIRECT_URL`, admin access codes or
  the auth signing secret.
