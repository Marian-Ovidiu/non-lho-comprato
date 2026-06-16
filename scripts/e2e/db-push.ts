import { spawn } from "node:child_process";

import { assertE2EEnvGuard, loadE2EEnv } from "./env";

loadE2EEnv();
assertE2EEnvGuard();

const child = spawn("npx", ["prisma", "db", "push"], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
