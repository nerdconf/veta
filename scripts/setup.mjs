#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const mcpPath = join(projectRoot, "scripts", "veta-mcp-server.mjs");
const agentFlag = process.argv.find((argument) => argument.startsWith("--agent="));
const agentIndex = process.argv.indexOf("--agent");
const agent = (agentFlag?.split("=")[1] ?? (agentIndex >= 0 ? process.argv[agentIndex + 1] : ""))?.toLowerCase();

function run(command, args, { ignoreFailure = false } = {}) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ignoreFailure ? "ignore" : ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (ignoreFailure) return "";
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(`${command} no pudo completar la instalación: ${detail}`);
  }
}

async function configureCursor() {
  const configPath = join(homedir(), ".cursor", "mcp.json");
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    // A missing file starts with an empty MCP configuration.
  }
  config.mcpServers ??= {};
  config.mcpServers.veta = {
    command: process.execPath,
    args: [mcpPath],
    env: { VETA_AGENT: "cursor" },
  };
  await mkdir(dirname(configPath), { recursive: true });
  const temporaryPath = `${configPath}.veta.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rename(temporaryPath, configPath);
}

async function main() {
  if (!agent || !["codex", "claude", "cursor"].includes(agent)) {
    throw new Error("El agente instalador debe ejecutar `npm run setup -- --agent codex`, `claude` o `cursor`.");
  }

  if (agent === "codex") {
    run("codex", ["mcp", "remove", "veta"], { ignoreFailure: true });
    run("codex", ["mcp", "add", "--env", "VETA_AGENT=codex", "veta", "--", process.execPath, mcpPath]);
  } else if (agent === "claude") {
    run("claude", ["mcp", "remove", "veta", "--scope", "user"], { ignoreFailure: true });
    run("claude", ["mcp", "add", "veta", "--scope", "user", "--env", "VETA_AGENT=claude", "--", process.execPath, mcpPath]);
  } else {
    await configureCursor();
  }

  process.stdout.write([
    `Veta quedó conectada a ${agent}.`,
    "La base y la app se iniciarán solas con el primer uso.",
    "Seguí AGENT_INSTALL.md para abrir X, recorrer los bookmarks e importarlos.",
    "",
  ].join("\n"));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
