# MariaDB adapter

The project keeps the existing Supabase adapter unchanged and adds a parallel
MariaDB adapter with the same client API.

Client-side services can later switch from:

```ts
import db from "./database";
```

to:

```ts
import db from "./mariaDatabase";
```

The MariaDB adapter never exposes database credentials to the browser. Browser
calls go to `/api/mariadb`; that Next.js API route uses the server-only MariaDB
connection pool. The API stays disabled unless `MARIADB_API_ENABLED=true`, so
adding this adapter does not activate a second database backend by accident.

## Required environment variables

```env
MARIADB_API_ENABLED=true
MARIADB_HOST=127.0.0.1
MARIADB_PORT=3306
MARIADB_USER=ozen_app
MARIADB_PASSWORD=change-me
MARIADB_DATABASE=ozen_retreats
MARIADB_CONNECTION_LIMIT=10
```

For house-map image uploads on a self-hosted server:

```env
HOUSE_MAP_UPLOAD_DIR=/var/www/ozen/uploads/house-maps
HOUSE_MAP_UPLOAD_BASE_URL=https://example.com/uploads/house-maps
```

`HOUSE_MAP_UPLOAD_DIR` must be writable by the Node.js process.
`HOUSE_MAP_UPLOAD_BASE_URL` must point to the same directory through the web
server (for example Nginx). This filesystem upload model is intended for the
self-hosted server and is not durable on ephemeral/serverless filesystems.

## Dependency

The server adapter uses `mysql2`. After applying the patch run:

```bash
npm install
```

This also refreshes `package-lock.json` with the new dependency.

## Database compatibility

The MariaDB database is expected to expose the same tables and columns as the
current application contract:

```text
roles
users
houses
rooms
house_maps
retreats
retreat_rooms
guests
guest_statuses
taxi_rides
taxi_guests
```

`house_maps.room_positions` may be a MariaDB JSON column or JSON text. The
adapter serializes it on writes and parses it on reads.

Boolean application fields are written as `0/1` and converted back to
booleans when read.

## Security

The current application does not yet have production authentication. Enabling the
MariaDB API therefore exposes the allowed application operations to clients that
can reach the site. Keep `MARIADB_API_ENABLED` disabled until authentication and
server-side authorization are added for production use.
