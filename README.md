# ShiftManager

A collaborative shift scheduling tool. Admins define locations and named time blocks, assign people to shifts, and everyone sees the result in a color-coded weekly calendar.

## Features

- **Passwordless auth** — log in with just a name; share a room link for others to join
- **Locations & time blocks** — define reusable named blocks (e.g. "Morning 08:00–16:00") like a list, similar to locations
- **Weekly calendar** — assignments shown in a 7-day grid, grouped by time block per day
- **Color-coded people** — each person gets a distinct color across the calendar
- **Admin controls** — add/remove locations, time blocks, and people; assign and remove shifts inline
- **Add people directly** — admins can add someone by name without waiting for them to join; an account is created automatically if they haven't registered yet

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend  | Express.js (Node 18+)               |
| Database | Prisma ORM — SQLite (dev) / PostgreSQL (prod) |
| Auth     | JWT (stored in localStorage)        |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL="file:./dev.db"   # SQLite, zero setup
JWT_SECRET="your-long-random-secret"
PORT=3001
```

### 3. Initialize the database

```bash
npm run db:push
```

### 4. Run in development

```bash
npm run dev
```

This starts both servers concurrently:
- **Next.js** frontend → http://localhost:3000
- **Express** API → http://localhost:3001

## Scripts

| Command            | Description                                  |
|--------------------|----------------------------------------------|
| `npm run dev`      | Start both API and frontend with hot reload  |
| `npm run dev:api`  | API only (nodemon)                           |
| `npm run dev:web`  | Frontend only (Next.js)                      |
| `npm run build`    | Production build (generates Prisma client + Next.js build) |
| `npm run start:api`| Start API in production                      |
| `npm run start:web`| Start frontend in production                 |
| `npm run db:push`  | Sync schema to database (dev, resets data)   |
| `npm run db:studio`| Open Prisma Studio to browse the database   |

## Project Structure

```
/app/               Next.js pages (App Router)
  /login            Login page
  /room/[id]        Room dashboard (schedule + admin panel)
  page.tsx          Landing / room creation

/components/
  AdminPanel.tsx    Admin controls (locations, time blocks, people, assignments)
  ScheduleView.tsx  Weekly calendar view

/src/               Express API
  /controllers/     Business logic
  /middleware/      JWT auth, room membership checks
  /routes/          Route definitions
  /lib/prisma.js    Prisma client

/context/           React auth context
/lib/api.ts         Typed frontend API client
/types/index.ts     Shared TypeScript interfaces
/prisma/schema.prisma  Database schema
```

## Data Model

- **Room** — a scheduling namespace; members, locations, and time blocks belong to a room
- **TimeBlock** — reusable named shift slot with start/end times (e.g. "Morning", 08:00–16:00)
- **ShiftLocation** — a named place (e.g. "Front Desk")
- **ShiftAssignment** — links a person to a location + time block on a specific date
- **RoomMember** — user-room relationship with role (`ADMIN` or `PARTICIPANT`)

## API Overview

All endpoints require `Authorization: Bearer <token>`. Admin-only endpoints additionally require the `ADMIN` role in that room.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/session` | Login / register by name → JWT |
| `POST` | `/api/rooms` | Create a room |
| `GET` | `/api/rooms/:id` | Get room details |
| `POST` | `/api/rooms/:id/join` | Join a room |
| `POST` | `/api/rooms/:id/members` | Add person by name *(admin)* |
| `PUT` | `/api/rooms/:id/members/:userId/role` | Change member role *(admin)* |
| `DELETE` | `/api/rooms/:id/members/:userId` | Remove member *(admin)* |
| `POST` | `/api/rooms/:id/locations` | Add location *(admin)* |
| `DELETE` | `/api/rooms/:id/locations/:locationId` | Remove location *(admin)* |
| `POST` | `/api/rooms/:id/time-blocks` | Add time block *(admin)* |
| `DELETE` | `/api/rooms/:id/time-blocks/:blockId` | Remove time block *(admin)* |
| `POST` | `/api/rooms/:id/assignments` | Assign a shift *(admin)* |
| `DELETE` | `/api/rooms/:id/assignments/:assignmentId` | Remove a shift *(admin)* |
| `GET` | `/api/rooms/:id/schedule` | Get full schedule |

## Production

Switch `DATABASE_URL` to a PostgreSQL connection string and run:

```bash
npm run build
npm run start:api &
npm run start:web
```

Set `NEXT_PUBLIC_API_URL` in your environment if the API is on a different origin than the frontend (defaults to `/api`).
