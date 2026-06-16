import { spawn } from "node:child_process";

import { assertE2EEnvGuard, loadE2EEnv } from "./env";

loadE2EEnv();
assertE2EEnvGuard();

process.env.E2E_TEST_AUTH_ENABLED = "true";
process.env.PORT = process.env.PORT ?? "3100";

const child = spawn("npx", ["next", "dev", "-p", process.env.PORT], {
  stdio: "inherit",
  env: process.env,
});

function forward(signal: NodeJS.Signals) {
  child.kill(signal);
}

process.on("SIGINT", forward);
process.on("SIGTERM", forward);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
