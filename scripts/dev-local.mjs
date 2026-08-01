import { spawn } from "node:child_process";

const children = [];

function launch(label, command, args) {
  const child = spawn(command, args, {
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) process.stderr.write(`[${label}] terminó con código ${code}\n`);
  });
}

launch("site", "npm", ["run", "dev"]);
launch("agent", "npm", ["run", "agent:bridge"]);

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 800).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

