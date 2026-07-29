// Vercel build: bundle the Express app (plus the source-only @repo/* workspace
// packages, which export raw .ts) into ONE self-contained CommonJS file and emit
// it via the Vercel Build Output API (v3).
//
// Why: @vercel/node treats everything under node_modules as external and never
// transpiles it, so the symlinked workspace packages left runtime requires to
// `@repo/shared/src/index.ts` (a .ts file Node can't load) -> 500s. esbuild
// transpiles + inlines all of that here, so the deployed function has zero
// @repo/* (or any .ts) requires.
import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(backendDir, ".vercel", "output");
const funcDir = path.join(outDir, "functions", "index.func");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

await build({
  entryPoints: [path.join(backendDir, "api", "index.ts")],
  outfile: path.join(funcDir, "index.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  // Optional/native deps that must not be bundled: pg's native binding and its
  // Cloudflare-Workers-only socket shim (neither is used on Node/Vercel).
  external: ["pg-native", "cloudflare:sockets"],
  logLevel: "info",
});

// Function config: Node runtime, our bundle is the handler. shouldAddHelpers
// gives Express the (req,res) it expects; the launcher unwraps `export default`.
writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    },
    null,
    2,
  ),
);

// Route every request to the single function.
writeFileSync(
  path.join(outDir, "config.json"),
  JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/index" }] }, null, 2),
);

console.log("Build Output API written to", outDir);
