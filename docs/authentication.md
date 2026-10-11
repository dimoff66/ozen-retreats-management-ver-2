# Authentication

The application uses username/password authentication with a stateless seven-day
session stored in an `HttpOnly` cookie.

## Password storage

No additional database column is required. The existing `users.password` column
stores versioned `scrypt` hashes for new or changed passwords. Legacy plaintext
passwords are accepted only during a successful login and are immediately replaced
with a `scrypt` hash.

The browser-facing `User` DTO never contains the password or password hash.

## Required environment variables

For every deployment:

```env
AUTH_SESSION_SECRET=<at-least-32-random-characters>
```

Generate a secret locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

For Supabase deployments, authentication and user administration also require the
server-only service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Never prefix either variable with `NEXT_PUBLIC_`.

MariaDB deployments continue to use the existing `MARIADB_*` server variables.
When `MARIADB_API_ENABLED=true`, authentication reads users from MariaDB.

## Supabase migration

Apply `supabase/migrations/202610100001_protect_user_password.sql`. It removes
browser-role access to the password column and user mutations while preserving
read access to the public user fields used by the application.

## Login behavior

The login screen never downloads or displays the database login list. After a
successful login, that login is stored in the current browser's local storage and
may appear later as a local input suggestion. Failed logins do not add anything to
that list.

Changing a user's password invalidates older session tokens because the session is
bound to a fingerprint of the current stored password hash.
