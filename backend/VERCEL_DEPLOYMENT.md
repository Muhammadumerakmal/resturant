# Vercel Deployment — Errors & Fixes

How the backend (`@repo/backend`, an Express API) is deployed to Vercel, the
three errors we hit getting there, and why the current setup works. Read this
before changing `vercel.json`, `scripts/build.mjs`, or the Vercel project's
build settings.

---

## TL;DR

The backend is a workspace in a **Turborepo** whose shared packages
(`@repo/shared`, `@repo/db`, `@repo/agent`) are **source-only** — their
`package.json` `exports` point at raw `./src/index.ts`, with **no build step**.
Vercel's Node builder can't consume raw `.ts` from `node_modules`, so the
backend is instead **bundled by esbuild into one self-contained function** and
shipped via the **Vercel Build Output API**.

Three things had to be true for this to work:

1. Tool args are hand-typed so the build type-checks (`tools.ts`).
2. `scripts/build.mjs` esbuild-bundles everything (inlining the `@repo/*` `.ts`).
3. `vercel.json` sets **`"framework": null`** so Vercel does **not** run its
   Express preset (which would build a competing, broken function).

Project settings that matter: **Root Directory = `backend`**, Build Command =
`npm run vercel-build` (from `vercel.json`).

---

## Symptom

Every request to the deployed backend returned **HTTP 500**:

```
500  FUNCTION_INVOCATION_FAILED
Cannot find module '/var/task/node_modules/@repo/shared/src/index.ts'
Did you forget to add it to "dependencies" in `package.json`?
Node.js process exited with exit status: 1.
```

`/health`, `/`, `/api/v1/*` — all 500. The build itself reported "Ready".

---

## The three errors (in the order they surfaced)

Each fix uncovered the next problem underneath it.

### 1. Build-time type error — `TS2769` in `packages/agent/src/tools.ts`

```
../packages/agent/src/tools.ts(69,14): error TS2769: No overload matches this call.
  ... Argument of type 'unknown[]' is not assignable to parameter of type
      'SQLWrapper | readonly (string | Placeholder<...>)[]'.
```

**Why:** Vercel's build type-checks with its own compiler options (not
`backend/tsconfig.json`'s `moduleResolution: "Bundler"`). Under those settings
the zod-inferred leaf types coming out of `@openai/agents`' `tool()` collapse to
`unknown`, so `items.map(i => i.menu_item_id)` produced `unknown[]`, which
Drizzle's `inArray()` rejects. It passed locally (Bundler resolution inferred
`string`) but failed on Vercel — same versions, different compiler config.

**Fix:** hand-type the `execute` args in `tools.ts` so `ids` is unambiguously
`string[]` regardless of compiler settings.

### 2. Runtime error — `Cannot find module '@repo/shared/src/index.ts'`

Once it built, every request crashed on load.

**Why:** `@vercel/node` treats everything under `node_modules` as **external**
and never transpiles it. The workspace packages are symlinked into
`node_modules` with a **raw `.ts` entrypoint**, so the deployed function did
`require('.../@repo/shared/src/index.ts')` — a TypeScript file Node cannot load.

**Fix:** stop depending on Vercel to bundle the workspace packages. Add
`scripts/build.mjs`, which uses **esbuild** to bundle the Express app **plus all
`@repo/*` packages** (esbuild transpiles the `.ts`) into a single self-contained
CommonJS file, emitted via the **Vercel Build Output API**
(`.vercel/output/functions/index.func/index.js` + `.vc-config.json` +
`config.json`). The deployed function then has **zero** `@repo/*` (or any `.ts`)
requires. Verified locally: the bundle loads and `GET /health` returns `200`.

### 3. The real culprit — Framework Preset = `Express`

Even after (2), the runtime still threw the exact `@repo/shared/src/index.ts`
error. The build log revealed **two** builds running:

```
> node scripts/build.mjs
  .vercel/output/functions/index.func/index.js  4.1mb   <- our good bundle
  Build Output API written to /vercel/path0/backend/.vercel/output
Using TypeScript 5.9.3 (local user-provided)            <- Vercel's OWN build (!)
Build Completed in /vercel/output
```

The Vercel **project setting `Framework Preset: Express`** makes Vercel
auto-build the Express app as its **own** `@vercel/node` serverless function
(the `Using TypeScript ...` step). That function imports `@repo/shared` → the
un-transpiled `.ts` → the crash. It ran **on top of and overrode** our Build
Output API bundle. This is why deleting the `api/` directory didn't help — the
Express preset finds the Express entry no matter where it lives.

**Fix:** set **`"framework": null`** in `backend/vercel.json`. Vercel then runs
**only** our `buildCommand` and serves the Build Output API bundle — no
competing Express/`@vercel/node` function.

> A `vercel.json` field overrides the matching Vercel dashboard project setting
> for that deployment (the dashboard even warns "Configuration Settings in the
> current Production deployment differ from your current Project Settings").

---

## Current setup (what makes it work)

**`backend/vercel.json`**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": "npm run vercel-build"
}
```

**`backend/package.json`** — `"vercel-build": "node scripts/build.mjs"`, plus
`esbuild` in `devDependencies`.

**`backend/scripts/build.mjs`** — esbuild-bundles `backend/vercel-entry.ts`
(which just `export default createApp()`) into
`.vercel/output/functions/index.func/index.js`, and writes the Build Output API
`.vc-config.json` (Node runtime) and `config.json` (route `/(.*)` → the
function). `pg-native` and `cloudflare:sockets` are marked external (unused,
optional).

**`backend/vercel-entry.ts`** — deliberately **not** under an `api/` directory
(an `api/` dir triggers Vercel's zero-config function detection, re-introducing
the `.ts` problem).

**Vercel project settings** — Root Directory = `backend`; Framework Preset
should be **Other** (the `vercel.json` `framework: null` already forces this per
deploy, but aligning the dashboard removes the config-mismatch warning).

**Required environment variables** (Settings → Environment Variables,
Production): `DATABASE_URL` (Neon **pooled**), `STAFF_API_KEY`, `CORS_ORIGIN`,
and `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`. `DATABASE_URL` is read at
module load — if it's missing the function crashes on every request.

---

## Verifying a deployment

```bash
curl https://<deployment>/health            # -> 200 {"ok":true}
curl https://<deployment>/api/v1/menu        # -> 200 [ ...menu items... ]  (hits Neon)
curl https://<deployment>/api/v1/orders      # -> 401 (staff key required — expected)
```

If `/health` 500s: check the **Runtime Logs** for the deployment. `Cannot find
module @repo/...` means a competing `@vercel/node` build slipped back in (check
`framework` and that no `api/` dir exists). `DATABASE_URL is not set` means the
env var is missing.

---

## Known limitation — realtime

SSE (`GET /api/v1/orders/stream`) and the Postgres `LISTEN/NOTIFY` listener need
a long-lived process, which serverless functions don't provide. On Vercel the
stream won't stay open; the frontend already falls back to polling
`GET /api/v1/orders`, so kitchen/owner views stay live. For persistent realtime,
host the backend on a long-running Node process instead.
