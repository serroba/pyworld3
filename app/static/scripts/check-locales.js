#!/usr/bin/env node

/**
 * Verify all locale files have the same keys as en.json.
 *
 * Missing keys → error (exit 1).
 * Extra keys   → warning (exit 0).
 *
 * Usage:
 *   node scripts/check-locales.js
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = resolve(__dirname, "../data/locales");

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const locales = new Map();

for (const f of files) {
  const data = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
  locales.set(f, new Set(Object.keys(data)));
}

const en = locales.get("en.json");
if (!en) {
  console.error("en.json not found");
  process.exit(1);
}

let status = 0;

for (const [file, keys] of locales) {
  if (file === "en.json") continue;

  const missing = [...en].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !en.has(k));

  for (const k of missing) {
    console.error(`ERROR  ${file}: missing key "${k}"`);
    status = 1;
  }
  for (const k of extra) {
    console.warn(`WARN   ${file}: extra key "${k}" not in en.json`);
  }
}

if (status === 0) {
  console.log(
    `Locale check: ${locales.size} files, ${en.size} keys each — all complete`,
  );
}

process.exit(status);
