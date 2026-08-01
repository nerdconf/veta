import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const candidates = [
  process.env.VETA_APP_PATH,
  join(homedir(), ".veta", "app"),
].filter(Boolean);

let serverPath = null;
for (const candidate of candidates) {
  const path = join(candidate, "scripts", "veta-mcp-server.mjs");
  try {
    await access(path);
    serverPath = path;
    break;
  } catch {
    // Try the next supported installation path.
  }
}

if (!serverPath) {
  process.stderr.write("Veta is not installed. Ask Codex to install https://github.com/nerdconf/veta following AGENT_INSTALL.md.\n");
  process.exit(1);
}

const child = spawn(process.execPath, [serverPath], {
  env: { ...process.env, VETA_AGENT: "codex" },
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
