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

Internal cookie/local-storage keys use the neutral `project` prefix. Deploying the
identifier cleanup changes those keys once, so an already-open browser may need to
sign in again and may lose previously saved local UI/login preferences.

## Permanent login links

A user may have an optional unique `users.link_code`. Administrators set the code
manually in Admin → Users and can copy a URL in the form:

```text
https://app.example/?link=<link_code>
```

Opening the URL authenticates the matching user without a password and creates
the same seven-day `HttpOnly` session as password login. The link code itself has
no expiration. If a valid session already exists, that session always wins and
the link code is ignored. Only when there is no valid session does the application
read the link code. After the code is accepted, the application redirects to `/` so
the code is removed from the browser address bar.

The link code is a permanent bearer credential and should therefore be long and
hard to guess. Clearing or changing `link_code` immediately disables the old
login link, while an already-issued seven-day session remains valid.

Apply `supabase/migrations/202610110001_add_user_link_code.sql` for Supabase or
`mariadb/migrations/202610110001_add_user_link_code.sql` for MariaDB.
