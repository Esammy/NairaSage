/**
 * After `next build`, assert critical App Router paths exist in the manifest.
 * Usage: node scripts/check-next-routes.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const manifestPath = join(root, ".next", "app-path-routes-manifest.json");

const required = ["/login", "/register", "/dashboard", "/dashboard/chat", "/pricing", "/"];

function main() {
  if (!existsSync(manifestPath)) {
    console.error("Missing .next/app-path-routes-manifest.json — run `next build` first.");
    process.exit(1);
  }
  const raw = readFileSync(manifestPath, "utf8");
  const routes = JSON.parse(raw);
  // Manifest maps app paths (e.g. "/(auth)/login/page") → URL paths (e.g. "/login").
  const urlPaths = new Set([...Object.keys(routes), ...Object.values(routes)]);
  const missing = required.filter((r) => !urlPaths.has(r));
  if (missing.length) {
    console.error("Missing routes in manifest:", missing);
    console.error("Available sample:", [...urlPaths].slice(0, 25).join(", "), "...");
    process.exit(1);
  }
  console.log("Route manifest OK:", required.join(", "));
}

main();
