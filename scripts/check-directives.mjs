#!/usr/bin/env node
/**
 * Fails when a file-level "use server"/"use client" directive is not on the
 * first line: misplaced directives pass tsc/tsx/lint but break `next build`
 * (Turbopack) in production. Function-level "use cache"/"use server" are
 * indented, so they don't trigger this check.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = process.argv[2] ? [process.argv[2]] : ["src", "app", "components", "lib"];
const failures = [];

function checkFile(path) {
  const source = readFileSync(path, "utf8");
  const lines = source.split("\n");
  const firstLine = lines[0].trim();

  for (let i = 0; i < lines.length; i += 1) {
    // Unindented directive = file-level intent, wherever it ended up.
    if (/^"use (server|client)";\s*$/.test(lines[i])) {
      if (i !== 0) {
        failures.push(`${path}:${i + 1}: direttiva file-level non in riga 1 (riga 1: ${firstLine || "<vuota>"})`);
      }
      return;
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "generated" || name === "node_modules") continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path);
    } else if (/\.(ts|tsx|mts|mjs)$/.test(name) && !name.includes(".test.")) {
      checkFile(path);
    }
  }
}

for (const root of ROOTS) {
  try {
    walk(root);
  } catch {
    // root assente: ok
  }
}

if (failures.length > 0) {
  console.error("Direttive mal posizionate:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("check-directives: ok");
