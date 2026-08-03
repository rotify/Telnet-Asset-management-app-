# Telnet Asset Manager — project setup

This folder is already a complete, runnable Next.js project — not just loose files. No `create-next-app` step needed.

## 1. Prerequisites

- Node.js 18.18+ (check with `node -v`)
- VS Code
- Git (optional but recommended)

## 2. Open it in VS Code

Unzip `telnet-asset-manager.zip` wherever you keep projects (into a clean spot — delete any old `telnet-asset-manager` / `telnet-asset-manager 2` folders first so you don't end up editing a stale copy), then:

```bash
cd telnet-asset-manager
code .
```

## 3. Install dependencies

```bash
npm install
```

If you hit an `EACCES` / `EEXIST` error in `~/.npm/_cacache`, that's a local npm cache permissions issue, not this project:

```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install
```

## 4. Configure the API

```bash
cp .env.example .env.local
```

It already points at the real backend:

```
API_BASE_URL=https://company-assets-management-system.onrender.com/api
```

## 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000/login`. First request may take 30-60s — the backend is on Render's free tier and cold-starts after idling.

The login form calls our own `/api/auth/login` route (`src/app/api/auth/login/route.ts`), which proxies server-side to the real backend's `POST /api/get-token/`. That's deliberate: calling the Render API directly from the browser would hit CORS, and it keeps `API_BASE_URL` off the client.

Real backend contract, reverse-engineered from your Postman docs + a live network trace (its docs page had the request examples blank):

```
POST {API_BASE_URL}/get-token/
Body: { "username": "...", "password": "..." }
200 → { "token": "..." }
401 → { "error": "Invalid credentials" }
400 → { "error": "username and password required" }
```

Every other endpoint (`/api/equipment/`, `/api/vehicles/`) expects `Authorization: Token <token>` on every request — Django REST Framework's TokenAuthentication.

## 6. Superadmin (stopgap, read this)

The real backend has no `/me` or `/profile` endpoint — checked `/api/me/`, `/api/profile/`, `/api/user/`, `/api/users/`, `/api/staff/` and more, all 404. So there's no way for the frontend to ask the backend "who is this and what's their role." `get-token/` returns only `{ "token": "..." }`.

Until that exists, `src/lib/auth.ts` hardcodes a client-side allowlist:

```ts
const SUPERADMIN_USERNAMES = ["olastickz"];
```

`Olastickz` is treated as superadmin and lands on `/admin/dashboard`; everyone else lands on `/dashboard`. The header shows a "Superadmin" badge when that user is signed in.

**This is not real access control** — it's a UI convenience so the admin section has something to gate against while the backend catches up. Replace it once the backend exposes real roles (search `SUPERADMIN_USERNAMES` / `isSuperAdmin` in `src/lib/auth.ts`).

## 7. Suggested build order from here

1. **Admin — staff onboarding**: build this on `/admin/dashboard`, gated the same way (`isSuperAdmin`).
2. **Equipment/vehicle CRUD**: the real API is live — `GET/POST/PUT/DELETE /api/equipment/` and `/api/vehicles/`. Equipment fields: `name, equipment_type, description, purchase_date, warranty_expiry, status, location, regional_office, cost, notes, subsidiary, serial_number, tag_number, assigned_user, quantity, remarks, assigned_staff, asset`. Vehicle fields: `name, license_plate, vin_number, make, model, asset_type, status, insurance_expiry, roadworthy_expiry, license_expiry, hackney_permit, cost, assigned_staff, asset`. Both carry an `asset` field pointing at a shared parent Asset record.
3. **Asset assignment + history**: build against that `asset`/`assigned_staff` relationship once the assignment-history endpoint is confirmed (not in the 3 Postman docs sent so far).
4. **Maintenance logs + company documents**: this is the module the PRD document actually specs in detail — build against that spec directly.
5. **Real role-based routing**: replace the stopgap in step 6 once the backend exposes role.

## 8. Gaps worth flagging

- No role/profile endpoint on the live backend.
- The 3 Postman docs only cover auth + equipment + vehicles — no document/maintenance module, staff-onboarding, or assignment-history endpoint yet.
- The PRD document only specs the Company Document module.
