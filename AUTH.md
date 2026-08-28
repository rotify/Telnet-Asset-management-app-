# How authentication works in this app

This document explains, end to end, how sign-in, request authentication, and admin
access currently work in the Telnet Asset Manager frontend. It reflects the actual
code as of this writing, not an idealized design — including the parts that are
stopgaps.

There is **no `next-auth` or any auth library** in this project (confirmed — not in
`package.json`). Everything described below is hand-rolled in `src/lib/auth.ts` and
a handful of API route handlers.

---

## The three things "auth" actually means here

It's useful to separate this into three distinct mechanisms, because they have very
different levels of real security behind them:

1. **Login** — proving who you are to the real backend. This part is real.
2. **Request authentication** — proving who you are on every subsequent API call.
   Also real, and it's the same mechanism as #1.
3. **Authorization / role gating** — deciding what you're allowed to see once
   logged in (e.g. the admin dashboard). **This part is not real** — it's a
   hardcoded frontend allowlist, not anything the backend enforces.

---

## 1. Login path

```
Browser (LoginForm)
   │  username + password
   ▼
POST /api/auth/login              (Next.js route handler, runs server-side)
   │  src/app/api/auth/login/route.ts
   ▼
POST http://207.180.246.69:7038/api/get-token/    (real Django backend)
   │  { username, password }
   ▼
200 { "token": "abc123..." }   or   401 { "error": "..." }
```

- The browser never talks to the real backend directly. It always goes through the
  Next.js route first (`src/app/api/auth/login/route.ts`), which forwards the
  request server-side. This avoids CORS issues and keeps the real backend URL out
  of client-side JS.
- The real backend uses Django REST Framework's built-in `TokenAuthentication`.
  `POST /get-token/` is DRF's standard `obtain_auth_token` endpoint — it checks
  username/password against Django's own `User` model and returns a single, static
  token. There's no expiry, no refresh token, no rotation.
- If the fetch to the backend fails outright (network error, backend down), the
  route catches that and returns a clean `502` with a friendly message instead of
  crashing. If the backend responds with an error (bad credentials), that error is
  passed through as-is.

## 2. Where the token is stored

Once the frontend has a token, `storeSession()` in `src/lib/auth.ts` puts it in the
browser:

```ts
const storage = rememberMe ? window.localStorage : window.sessionStorage;
storage.setItem("telnet_auth_token", token);
storage.setItem("telnet_auth_username", username);
```

- **"Keep me logged in" checked** → `localStorage`. Survives closing the browser
  tab/window entirely; persists until explicitly cleared or storage is wiped.
- **Unchecked** → `sessionStorage`. Cleared as soon as the browser tab is closed.
- `getStoredToken()` checks both locations (`localStorage` first, then
  `sessionStorage`), so the rest of the app doesn't need to know which one was used.
- This is a **plain string token in browser storage**, not an HttpOnly cookie and
  not a signed/encrypted JWT. It's readable by any JavaScript running on the page
  (including, in theory, an XSS payload) — worth knowing if this app ever handles
  more sensitive data.

## 3. Request authentication path (every page after login)

Every API call in `src/lib/api.ts` — `getStaff()`, `createEquipment()`,
`deleteVehicle()`, etc. — goes through one of two shared helpers,
`authedFetch()` or `authedMutate()`. Both do the same thing:

```
authedFetch("/api/staff")
   │  reads token via getStoredToken()
   │  attaches header: Authorization: Token <token>
   ▼
GET /api/staff                    (Next.js proxy route)
   │  src/app/api/staff/route.ts
   │  re-attaches the SAME Authorization header
   ▼
GET http://207.180.246.69:7038/api/staff/   (real backend)
```

- Every proxy route requires the `Authorization` header to be present, or it
  returns `401` immediately without even calling the backend.
- The real backend checks that header on every single request — this is DRF's
  `TokenAuthentication` again, just reused for all endpoints, not only login.
- There's no cookie, no session ID, no CSRF token anywhere in this flow. It's
  token-in-header, full stop, for both the Next.js layer and the Django layer.
- If a call ever gets a non-2xx response, `authedFetch`/`authedMutate` now surface
  the *real* backend error message (Django validation errors, etc.) instead of a
  generic "Request failed (400)" — this was added recently specifically to debug
  the Create Staff issues.

## 4. Logout

`clearStoredSession()` just deletes the token/username from both `localStorage`
and `sessionStorage`. There's no server-side call to invalidate the token on the
backend — the token itself stays valid until/unless someone deletes it directly in
Django. "Logging out" here only forgets it client-side.

## 5. Authorization / role gating — the part that isn't real

Every protected page (`/admin/dashboard`, `/admin/equipment`, `/dashboard`, etc.)
independently runs the same pattern in a `useEffect`:

```ts
useEffect(() => {
  const token = getStoredToken();
  if (!token) { router.replace("/login"); return; }
  if (!isSuperAdmin(getStoredUsername())) { router.replace("/dashboard"); return; }
  setGateChecked(true);
}, [router]);
```

- There is **no `middleware.ts`** in this project — nothing runs server-side to
  block access to a route. Every gate is a client-side check that runs after the
  page's JavaScript has already loaded, then redirects if it doesn't pass.
- `isSuperAdmin()` is this:

  ```ts
  const SUPERADMIN_USERNAMES = ["olastickz", "telnet"];
  export function isSuperAdmin(username) {
    return SUPERADMIN_USERNAMES.includes(username?.trim().toLowerCase());
  }
  ```

  That's it — a hardcoded list of two usernames, checked as plain string
  equality. It has nothing to do with the backend, nothing to do with the
  `Staff` record's "System Role" field (Super Admin/Admin/Driver/Staff) that you
  can pick on the Add Staff form — that field is saved to the Staff record and
  never read anywhere in the auth logic.
- This was a documented stopgap from early in the project (see `SETUP.md` §6):
  the real backend has no `/me`, `/profile`, or role-bearing endpoint at all
  (confirmed by testing `/api/me/`, `/api/profile/`, `/api/user/`, `/api/users/`
  — all 404). There is currently no way for the frontend to ask the backend "who
  is this and what can they do." The allowlist exists only so the admin section
  has *something* to gate against.
- Practical effect: anyone with valid backend credentials who isn't `olastickz` or
  `telnet` logs in fine, but lands on the plain `/dashboard` placeholder page,
  regardless of their actual job or what "System Role" was picked for their Staff
  record.

## 6. What "onboarding a staff member" does *not* currently do

This is a related gap worth being explicit about, since it's easy to assume the
Add Staff form creates a login:

- Add Staff (`POST /api/staff/`) creates a row in the `Staff` table — name,
  department, branch, job title, etc. It does not create a Django `User`, and it
  does not set a password.
- The `Staff` model does have a `user` field (a link to a Django `User`), which
  suggests the backend was designed for staff records to eventually be tied to a
  login account — but nothing in this app currently populates that link.
- Login accounts (username + password) can only be created directly on the
  backend today (e.g. via Django's own admin panel), by whoever has access to
  that server. There is no UI here for it.
- `POST /api/password-reset/` exists on the backend (confirmed via its Postman
  docs) but is not wired into this app.

## 7. Two dead links already in the code

- The login page's "Forgot password?" link points to `/forgot-password` — no
  such page exists in this app; it would 404.
- `requestPasswordReset()` in `auth.ts` calls `POST /api/auth/forgot-password` —
  no such Next.js route exists either. Both are unfinished stubs from earlier in
  the project.

## 8. File map

| File | Role |
|---|---|
| `src/app/login/page.tsx` | Login screen layout |
| `src/components/auth/login-form.tsx` | Form state, validation, calls `login()` |
| `src/lib/auth.ts` | `login()`, token storage, `isSuperAdmin()`, logout |
| `src/app/api/auth/login/route.ts` | Next.js proxy: browser → real backend `/get-token/` |
| `src/lib/api.ts` | `authedFetch()`/`authedMutate()` — attach token to every other API call |
| `src/app/api/**/route.ts` | Per-resource Next.js proxies, all require `Authorization` header |
| every `admin/**/page.tsx` and `dashboard/page.tsx` | Individually re-implement the same login+role gate in a `useEffect` |

## 9. If you want to harden this later

In rough priority order:
1. Get a real role/profile endpoint from the backend, so `isSuperAdmin` can be
   replaced with something the backend actually enforces (not just the frontend
   politely hiding a link).
2. Move route protection into `middleware.ts` so it's enforced before any page
   JS loads, instead of a client-side redirect after the fact.
3. Build the actual staff-onboarding-with-login flow: either a backend endpoint
   that creates a `User` + links it to the `Staff.user` field, or a documented
   manual process, plus wiring up the existing `POST /api/password-reset/`.
4. Either finish or remove the two dead password-reset stubs.
5. Consider moving the token out of `localStorage`/`sessionStorage` into an
   HttpOnly cookie if this app ever needs to be hardened against XSS — right now
   any script running on the page can read the auth token.
