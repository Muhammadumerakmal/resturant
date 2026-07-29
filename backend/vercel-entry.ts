import { createApp } from "./src/app";

// Build entry for Vercel. This is intentionally NOT under an `api/` directory:
// that would trigger Vercel's zero-config Serverless Functions detection, which
// compiles this file with @vercel/node — and @vercel/node treats the workspace
// packages under node_modules as external and never transpiles their raw .ts,
// producing runtime `Cannot find module '@repo/shared/src/index.ts'` crashes.
//
// Instead, scripts/build.mjs esbuild-bundles this entry (inlining all @repo/*
// TypeScript) and emits it via the Vercel Build Output API. Because there is no
// `api/` dir, the Build Output API function is the ONLY thing Vercel serves.
//
// Exports the Express app WITHOUT app.listen(); the app.listen() bootstrap for
// local / long-lived hosts lives in src/index.ts.
export default createApp();
