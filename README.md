# ShiftManager

A collaborative shift scheduling tool. Enter your name to sign in, then enter a room number to join an existing room or create a new one. Admins define locations and time slots, assign people to shifts, and everyone sees the result in a color-coded weekly calendar.

## Features

- **Room numbers** — rooms are identified by a number you choose (e.g. `/room/100`). Enter a number to join an existing room or create it
- **Passwordless auth** — log in with just a name; no passwords. The same name always returns you to your account
- **Locations & time slots** — define reusable named time slots (e.g. "Morning 08:00–16:00") alongside locations, both managed as simple lists
- **Rename anything** — admins can rename locations, time slots, and people inline; duplicate names are prevented
- **Weekly calendar** — assignments displayed in a 7-day grid, grouped by time slot within each day
- **Color-coded people** — each person gets a distinct color across the calendar
- **Admin controls** — add/remove/rename locations, time slots, and people; assign and remove shifts inline from the calendar
- **Add people directly** — admins can add someone by name without waiting for them to join; an account is created automatically if the person hasn't registered yet
- **Duplicate prevention** — adding a person or location/time slot that already exists is blocked with a clear error
- **Manager dashboard** — a password-protected view for listing and deleting all rooms

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend  | Express.js (Node 18+) |
| Database | PostgreSQL via Prisma ORM |
| Auth     | JWT (stored in localStorage) |

---

## Local Development

### Prerequisites

- Node.js 18+
- Docker (recommended) or a local PostgreSQL installation

### 1. Start the database

The quickest way is Docker. Run once to create the container:

```bash
docker run --name shiftmanagement-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:16
```

On subsequent sessions, just start the existing container:

```bash
docker start shiftmanagement-db
```

To stop it when you're done:

```bash
docker stop shiftmanagement-db
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

The default `.env` works out of the box with the Docker container above:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
JWT_SECRET="any-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
```

### 4. Push schema to database

```bash
npm run db:push
```

This creates all tables. Safe to re-run — only applies missing changes.

### 5. Start dev servers

```bash
npm run dev
```

Starts both concurrently:
- **Frontend** → http://localhost:3000
- **API** → http://localhost:3001

---

## Database Commands

| Command | What it does |
|---------|-------------|
| `npm run db:push` | Sync schema to the database (create/alter tables) |
| `npm run db:generate` | Regenerate Prisma Client from schema (no DB changes) |
| `npm run db:migrate` | Create a named migration file (for tracked migrations) |
| `npm run db:studio` | Open Prisma Studio — visual database browser at localhost:5555 |

> **`db:push` vs `db:migrate`** — `db:push` directly syncs the schema, no migration history. Good for development. `db:migrate` creates versioned SQL files you can commit and replay — recommended once you have real data in production.

---

## Production

### Environment variables required

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="long-random-secret-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://your-api-domain.com/api"
```

> Set `NEXT_PUBLIC_API_URL` if the API and frontend are on different origins. If they're on the same host (Railway monorepo, same domain with a proxy), leave it unset and requests go to `/api`.

### Build & start

```bash
npm run build      # generates Prisma client + Next.js build
npm run start:api  # starts Express on PORT
npm run start:web  # starts Next.js on port 3000
```

---

## Railway Deployment

[Railway](https://railway.app) is the recommended platform. It can run the frontend, API, and a Postgres database all in one project.

### Recommended setup: two services + one database

```
Railway Project
├── PostgreSQL  (add via New > Database > PostgreSQL)
├── API Service  (Express — points to repo root)
└── Web Service  (Next.js — points to repo root)
```

### Step-by-step

**1. Create a new Railway project**

Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.

**2. Add a PostgreSQL database**

Inside the project → New → Database → PostgreSQL. Railway will provision it and expose `DATABASE_URL` automatically.

**3. Add the API service**

New → GitHub Repo → configure:
- **Start command:** `node server.js`
- **Environment variables:**
  ```
  NODE_ENV=production
  PORT=3001
  JWT_SECRET=<generate a strong secret>
  JWT_EXPIRES_IN=7d
  DATABASE_URL=${{Postgres.DATABASE_URL}}   ← reference the DB service
  ```

After first deploy, run the schema push once via Railway's terminal or a one-off command:
```bash
npx prisma db push
```

**4. Add the Web (Next.js) service**

New → GitHub Repo → configure:
- **Build command:** `npm run build`
- **Start command:** `npm run start:web`
- **Environment variables:**
  ```
  NODE_ENV=production
  NEXT_PUBLIC_API_URL=https://<your-api-service>.railway.app/api
  ```

**5. Deploy**

Push to your main branch — Railway rebuilds both services automatically.

### Single-service alternative (simpler, less flexible)

If you want one Railway service serving both the API and frontend, you need a process manager (e.g. `concurrently` or `pm2`) and a reverse proxy. The two-service setup above is recommended instead.

---

## Project Structure

```
/app/               Next.js pages (App Router)
  /login            Login page
  /room/[id]        Room dashboard (schedule + admin panel)
  page.tsx          Landing — enter a room number to join or create

/components/
  AdminPanel.tsx    Admin controls (locations, time slots, people, assignments, rename)
  ScheduleView.tsx  Weekly calendar view with color-coded assignments

/src/               Express API
  /controllers/     Business logic
  /middleware/      JWT auth, room membership/admin checks
  /routes/          Route definitions
  /lib/prisma.js    Prisma client singleton

/context/           React auth context (JWT + user state)
/lib/api.ts         Typed frontend API client
/types/index.ts     Shared TypeScript interfaces
/prisma/schema.prisma  Database schema
```

---

## Data Model

| Model | Description |
|-------|-------------|
| `Room` | Scheduling namespace. Identified by a user-chosen integer `number` (e.g. 100) |
| `TimeBlock` | Reusable named time slot with start/end times (e.g. "Morning", 08:00–16:00). Displayed as "Time Slot" in the UI |
| `ShiftLocation` | A named place within a room (e.g. "Front Desk") |
| `ShiftAssignment` | Links a person to a location + time block on a specific date |
| `RoomMember` | User–room join with role: `ADMIN` or `PARTICIPANT` |
| `User` | Identity record — name only, no password |

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/session`.
Admin-only endpoints require the `ADMIN` role in that room.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/session` | — | Login / register by name → JWT |
| `POST` | `/api/rooms` | ✓ | Find or create room by `{ number }` |
| `GET` | `/api/rooms/:number` | member | Get room details |
| `POST` | `/api/rooms/:number/join` | ✓ | Join room as participant |
| `POST` | `/api/rooms/:number/members` | admin | Add person by name (creates account if needed) |
| `PATCH` | `/api/rooms/:number/members/:userId/name` | admin | Rename person |
| `PUT` | `/api/rooms/:number/members/:userId/role` | admin | Change member role |
| `DELETE` | `/api/rooms/:number/members/:userId` | admin | Remove member |
| `POST` | `/api/rooms/:number/locations` | admin | Add location |
| `PATCH` | `/api/rooms/:number/locations/:id` | admin | Rename location |
| `DELETE` | `/api/rooms/:number/locations/:id` | admin | Remove location |
| `POST` | `/api/rooms/:number/time-blocks` | admin | Add time slot |
| `PATCH` | `/api/rooms/:number/time-blocks/:id` | admin | Rename time slot |
| `DELETE` | `/api/rooms/:number/time-blocks/:id` | admin | Remove time slot |
| `POST` | `/api/rooms/:number/assignments` | admin | Assign a shift |
| `DELETE` | `/api/rooms/:number/assignments/:id` | admin | Remove a shift |
| `GET` | `/api/rooms/:number/schedule` | member | Get full schedule |
