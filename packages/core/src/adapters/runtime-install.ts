import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { TomomoAdapter } from "../types";

async function askConfirmation(prompt: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(prompt, resolve);
  });
  rl.close();
  return answer.trim().toLowerCase() !== "n";
}

// Split command string and spawn without shell for security
function runCommand(command: string): Promise<void> {
  const parts = command.split(/\s+/).filter(Boolean);
  const executable = parts[0];
  if (!executable) return Promise.reject(new Error("Empty install command"));
  const args = parts.slice(1);

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: "inherit" });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Install exited with code ${code}`));
      else resolve();
    });
    child.on("error", reject);
  });
}

// Built-in adapters: offer auto-install with confirmation
// Community adapters: show install instructions only (no auto-execution)
export async function tryInstallRuntime(
  adapter: TomomoAdapter,
  trusted: boolean
): Promise<boolean> {
  const { install } = adapter;

  if (!trusted) {
    // Community adapter: show instructions, don't auto-execute
    console.log(`\n${install.description} is not installed.\n`);
    console.log(`Install it manually:`);
    console.log(`  ${install.command}\n`);
    console.log(`More info: ${install.url}\n`);
    return false;
  }

  // Built-in adapter: offer guided auto-install
  console.log(`\n${install.description} is not installed.\n`);
  console.log(`Install now? This will run:`);
  console.log(`  ${install.command}\n`);

  const confirmed = await askConfirmation("(Y/n) ");

  if (!confirmed) {
    console.log(`\nSkipped. Install manually: ${install.url}\n`);
    return false;
  }

  console.log("\nInstalling...");

  try {
    await runCommand(install.command);
  } catch {
    console.log(`\nInstall failed. Install manually: ${install.url}\n`);
    return false;
  }

  // Verify installation
  const check = await adapter.check();
  if (!check.available) {
    console.log(
      `\nInstall completed but runtime not detected. Check: ${install.url}\n`
    );
    return false;
  }

  console.log("Done.\n");
  return true;
}
