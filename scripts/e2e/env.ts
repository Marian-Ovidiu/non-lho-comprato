import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function unquote(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadE2EEnv(fileName = ".env.e2e") {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = unquote(trimmed.slice(equalsIndex + 1));

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function assertE2EEnvGuard() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E scripts cannot run with NODE_ENV=production");
  }

  if (process.env.E2E_DATABASE_GUARD !== "non-lho-comprato-e2e") {
    throw new Error(
      "Refusing to run e2e setup without E2E_DATABASE_GUARD=non-lho-comprato-e2e",
    );
  }
}
