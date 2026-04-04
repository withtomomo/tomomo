import { Command } from "commander";
import { agentExists, getAgentSoulPath } from "@tomomo/core";
import { spawn } from "node:child_process";

export const editCommand = new Command("edit")
  .description("Open agent soul.md in your editor")
  .argument("<agent>", "Agent ID")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, options: { json?: boolean }) => {
    if (!(await agentExists(agentId))) {
      if (options.json) {
        console.log(
          JSON.stringify({ error: `Agent "${agentId}" not found` }, null, 2)
        );
        process.exit(1);
      }
      console.error(
        `Agent "${agentId}" not found. Run 'tomomo list' to see your agents.`
      );
      process.exit(1);
    }

    const soulPath = getAgentSoulPath(agentId);

    if (options.json) {
      console.log(JSON.stringify({ agentId, soulPath }, null, 2));
      return;
    }

    const editor = process.env.VISUAL || process.env.EDITOR;

    if (editor) {
      try {
        const parts = editor.split(/\s+/);
        await new Promise<void>((resolve, reject) => {
          const child = spawn(parts[0]!, [...parts.slice(1), soulPath], {
            stdio: "inherit",
          });
          child.on("close", (code) => {
            if (code !== 0)
              reject(new Error(`Editor exited with code ${code}`));
            else resolve();
          });
          child.on("error", reject);
        });
      } catch (err) {
        console.error(`Failed to open editor: ${(err as Error).message}`);
        process.exit(1);
      }
    } else {
      // Fallback: open with system default
      const cmd = process.platform === "darwin" ? "open" : "xdg-open";
      spawn(cmd, [soulPath], { stdio: "ignore", detached: true }).unref();
    }
  });
