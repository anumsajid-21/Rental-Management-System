# Rental Management System

Monorepo with a **clone-ready structure for a team** (currently 4 developers):

```
rental-management-system/
├── client/     # Vite + React SPA (UI)
├── server/     # Express + SQLite REST API (auth)
└── package.json  # root scripts (run both with one command)
```

## Quick start (each teammate, after cloning)

```bash
npm run install:all   # installs root + server + client dependencies
npm run init-db       # creates + migrates the SQLite database (server/data/rental.db)
npm run dev           # starts API (localhost:5000) + client (localhost:5173) together
```

Then open **http://localhost:5173**.

- `npm run dev:server` / `npm run dev:client` — run only one half
- `npm run build` — production build of the client

## Database (SQLite — no external DB server, no Docker)

- File-based DB at `server/data/rental.db` (git-ignored; each developer has their own local copy).
- **Schema is versioned via migrations** in `server/src/db/database.js` (`MIGRATIONS` array).
  When anyone changes the schema, they append a new migration entry — everyone else just
  runs `npm run init-db` after pulling and their local DB converges automatically.
- Passwords are hashed with **bcrypt** (10 rounds); JWT tokens authenticate requests.

### First-time setup for the environment file

Copy `server/.env.example` → `server/.env` and change `JWT_SECRET` to your own value.
(A working `server/.env` with dev defaults is included for convenience.)

## API (authentication phase)

| Method | Endpoint           | Auth   | Description                      |
|--------|--------------------|--------|----------------------------------|
| POST   | `/api/auth/register` | public | `{name, email, password, role}` → user + JWT |
| POST   | `/api/auth/login`    | public | `{email, password}` → user + JWT |
| GET    | `/api/auth/me`       | Bearer JWT | current user (used to validate sessions) |
| GET    | `/api/health`        | public | liveness check |

Role-based protection middleware is ready: `requireAuth` + `requireRole('tenant' | 'property_owner' | 'admin')`
in `server/src/middleware/auth.js`.

## Project structure

```
server/src/
  index.js               # app bootstrap (CORS, JSON, routes, error handling)
  db/database.js         # SQLite connection + migration runner
  db/initDb.js           # `npm run init-db` script
  models/userModel.js    # users table access (bcrypt hashing)
  models/roles.js        # role constants (admin extensible, hidden from sign-up)
  controllers/authController.js
  routes/authRoutes.js   # register / login / me
  middleware/auth.js     # requireAuth, requireRole (JWT)

client/src/
  lib/userStore.js       # API client for auth endpoints
  lib/roles.js           # role constants + role→home route map
  context/AuthContext.jsx# session state, persistence, signUp/signIn/logout
  components/            # ProtectedRoute, AuthLayout, TextField, RoleSelect, AreaPlaceholder
  pages/                 # SignIn, SignUp, TenantArea, OwnerArea
  styles/                # base.css, auth.css, areas.css (soft/light theme)
```

## Roles

- `tenant` and `property_owner` selectable at public sign-up
- `admin` defined in both `client/src/lib/roles.js` and `server/src/models/roles.js`
  but **excluded** from sign-up; a commented `/admin` route in `client/src/App.jsx`
  marks the future portal.

## Routes (client)

| Route    | Access                              |
|----------|-------------------------------------|
| `/signin`, `/signup` | public                  |
| `/tenant`  | authenticated `tenant` only     |
| `/owner`   | authenticated `property_owner` only |
| everything else | redirect → `/signin`       |

Sessions persist across refresh: the JWT is stored in `localStorage` and
re-validated against `/api/auth/me` on load.

## Team workflow notes

- The SQLite DB and `.env` are **per-developer** (git-ignored) — no shared state conflicts.
- The migration system is the coordination point for schema changes: never edit an
  already-applied migration; always append a new one.
- When the project grows, swap SQLite for Postgres/MySQL by replacing only
  `server/src/db/database.js` + `userModel.js` queries — the REST contract stays the same.

