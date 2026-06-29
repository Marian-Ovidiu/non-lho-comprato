#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (
      entry.isDirectory() &&
      ![
        ".git",
        ".next",
        "backups",
        "node_modules",
        "release",
        "src/lib/generated",
      ].some((ignored) => relativePath === ignored || relativePath.startsWith(`${ignored}/`))
    ) {
      files.push(...walk(relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

const adminClientPath = "src/lib/supabase/admin.ts";
const publicConfigPath = "src/lib/supabase/config.ts";
const adminClient = read(adminClientPath);
const publicConfig = read(publicConfigPath);

assert(
  adminClient.includes('import "server-only";') ||
    adminClient.includes("import 'server-only';"),
  `${adminClientPath} must import server-only`,
);
assert(
  !publicConfig.includes("SUPABASE_SERVICE_ROLE_KEY") &&
    !publicConfig.includes("serviceRoleKey"),
  `${publicConfigPath} must contain only public Supabase configuration`,
);

const forbiddenClientSecretRefs = [
  "app/",
  "src/components/",
  "src/lib/supabase/browser.ts",
  "src/lib/supabase/config.ts",
].map((item) => item.replaceAll(path.sep, "/"));

const serverOnlyEnvVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_FIELD_ENCRYPTION_KEY",
  "APP_FIELD_ENCRYPTION_PREVIOUS_KEYS",
];

for (const file of walk(".")) {
  const normalized = file.replace(/^\.\//, "").replaceAll(path.sep, "/");
  if (normalized === "scripts/security/check-server-secrets.mjs") {
    continue;
  }

  const content = read(normalized);
  const isDocumentation =
    normalized === "README.md" || normalized.startsWith("docs/");

  if (!isDocumentation && content.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
    failures.push(`${normalized} must not define a public service-role key`);
  }

  const isForbiddenClientSurface = forbiddenClientSecretRefs.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );

  for (const envVar of serverOnlyEnvVars) {
    if (content.includes(envVar) && isForbiddenClientSurface) {
      failures.push(`${normalized} must not reference ${envVar}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Server secret boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Server secret boundary check passed.");
