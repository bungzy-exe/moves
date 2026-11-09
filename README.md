# Moves

A mobility journal for everyday trips in Upper Austria. People record their journeys, look back at them week by week, and reflect on realistic alternatives. Every CO₂e estimate shows its source and its limits.

FH Oberösterreich, Interactive Media · Viktoria Dencheva and Angbeen Azeem · Supervisor: Rimbert Rudisch-Sommer · Release 20 January 2027

## Stack

| Part | Technology | Local address |
| --- | --- | --- |
| Frontend | React + TypeScript, built with Vite | http://localhost:5173 |
| Backend | Node.js + Express 5, TypeScript | http://localhost:3000 |
| Database | MongoDB Atlas M0, through Mongoose | cloud |

The browser only talks to the Vite dev server. Vite forwards every `/api/...` request to Express unchanged, so the app sees one address, just like it will after deployment.

```
client/   React app (Vite)
server/   Express API, exported from src/app.ts; src/dev-server.ts starts it locally
docs/     Project notes, including the deployment compatibility check
```

## First-time setup

You need Node.js 22 or newer (`node -v`).

1. **Install everything** from the repository root:

   ```bash
   npm run setup
   ```

2. **Create your Atlas connection.** In MongoDB Atlas, open the Moves cluster and:
   - under *Database Access*, create a database user for yourself (username and password);
   - under *Network Access*, add your current IP address (each of us adds our own);
   - under *Connect → Drivers*, copy the connection string.

3. **Add your local settings.**

   ```bash
   cp server/.env.example server/.env
   ```

   Open `server/.env` and paste the connection string into `MONGODB_URI`, with your database user's password filled in. This file is ignored by git, so it stays on your computer.

4. **Start both parts:**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173. The check page should show Frontend, Backend and Database as connected. To try it on your phone, open the "Network" address that Vite prints, with the phone on the same Wi-Fi.

## Everyday commands (from the root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts backend and frontend together |
| `npm run dev:server` / `npm run dev:client` | Starts only one of them |
| `npm test` | Backend tests (uses the database `moves_test`, never `moves_dev`) |
| `npm run typecheck` | TypeScript checks for both parts |
| `npm run build` | Production build of both parts |

## API so far

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Backend is running (no database) |
| POST | `/api/health/db` | Writes one test document to MongoDB, reads it back, removes it |

Errors always come back as JSON: `{ "error": { "code": "...", "message": "..." } }`.

## Troubleshooting

**Database: Not connected, "Add your current IP address"**: your IP is missing from the Atlas *Network Access* list. This also happens when you switch networks (home, campus, phone hotspot).

**"rejected the username or password"**: check the user and password in `MONGODB_URI`. Special characters in the password must be URL-encoded (for example `@` becomes `%40`).

**Backend: Not connected**: the Express server is not running or crashed. Look at the `[api]` lines in the terminal.

**Port 5173 or 3000 already in use**: another copy is still running. Stop it, or close the old terminal.

## Rules the backend follows (so it can run on Vercel later)

- No state in memory between requests. Sessions, caches and rate-limit counters go to MongoDB.
- No timers, background jobs or files written to disk.
- One MongoDB connection per process, created once and reused (`server/src/db.ts`).
- All settings come from environment variables. `.env.example` lists the names, never real values.
- Every route answers errors with JSON.
- Express serves no files. The frontend is built by Vite.

Details and open questions: [docs/deployment-compatibility.md](docs/deployment-compatibility.md).

## Data sources and credits

Emission factors: Umweltbundesamt Austria. Survey data: Land Oberösterreich. Map and routing data © OpenStreetMap contributors (ODbL); timetable data via Transitous.
