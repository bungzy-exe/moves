# Deployment compatibility note (Milestone 2)

Status: desk check only, 9 Nov 2026. Nothing has been deployed. This note compares our project layout with Vercel's current documentation, as planned for the 5–15 Nov window. The real test happens in the deployment window, 4–12 Jan.

## Result

Vercel Hobby looks compatible with the layout we chose, with one beta feature involved. We found no reason to change the stack. Two things stay open until we deploy for real: Vercel Services is still in beta, and nobody has run our Express app inside a Vercel Function yet.

## What the documentation says, and how the repo matches it

**Express runs as one function.** Vercel detects an Express app when a file such as `src/app.ts` default-exports it, and turns it into a single Vercel Function on Fluid compute. Our `server/src/app.ts` does exactly that and never calls `listen()`. The local start file is called `dev-server.ts` on purpose, so Vercel's detection cannot pick it up by mistake. Source: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

**`express.static()` is ignored on Vercel.** Our Express app serves no files. Vite builds the frontend, and on Vercel those files go to the CDN.

**Unhandled errors can leave the function in an undefined state.** Vercel's Express page warns about this. Every route in our backend answers errors as JSON through one error handler (`server/src/http-errors.ts`), and Express 5 forwards rejected promises to it automatically.

**Frontend and backend in one project.** Vercel Services lets one project hold several apps, each with its own root folder, routed by path. The documentation says Services are available in beta on all plans, which includes Hobby. The service receives the original request path, so `/api/health` arrives at Express as `/api/health`. That is why all our routes include the `/api` prefix, the same way the Vite dev proxy passes it through locally. Source: [The Complete Guide to Vercel Services](https://vercel.com/kb/guide/vercel-services).

**No state between requests.** A function instance can stop or be replaced at any time. The backend keeps nothing in memory except the cached MongoDB connection, which is designed to be recreated. Sessions, caches and rate-limit counters will live in Atlas from Milestone 3 on.

## Proposed `vercel.json` (not added to the repo yet)

We keep this here instead of in the repository root until it has been tested. The project framework setting in the Vercel dashboard must be set to "Services" for it to apply.

```json
{
  "services": {
    "web": { "root": "client/", "framework": "vite" },
    "api": { "root": "server/", "framework": "express", "entrypoint": "src/app.ts" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "api" } },
    { "source": "/(.*)", "destination": { "service": "web" } }
  ]
}
```

## What changes at deployment

Environment variables (`MONGODB_URI`, `MONGODB_DB_NAME=moves_prod`, and later the session secret) are entered in the Vercel project settings instead of `server/.env`. Atlas must accept connections from `0.0.0.0/0`, because Vercel functions use changing IP addresses, so the production database user needs a long random password. If Google Sign-In gets built, its production callback URL is added to the OAuth client.

## Open questions for the deployment window

1. Does Services beta build and route our two folders as configured above? Fallback: two separate Vercel projects, or the documented Express-only layout with the built frontend in `public/`.
2. Does Vercel's TypeScript build handle our ESM imports (`./config.js` pointing to `config.ts`)? We use the standard Node.js convention, so we expect yes.
3. Does client-side routing need an explicit `index.html` fallback rewrite for the `web` service once we add routes?
4. Does the Atlas M0 connection limit hold up when several function instances run at once? Each instance opens at most 5 connections (`maxPoolSize: 5`).

If the deployment fails, the January demonstration runs from the local build, as planned in chapter 09.
