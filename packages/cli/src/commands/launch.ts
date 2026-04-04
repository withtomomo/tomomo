import { Command } from "commander";
import { resolve } from "node:path";
import { agentExists } from "@tomomo/core";
import { launchAgent } from "../launcher";

export const launchCommand = new Command("launch")
  .description("Launch an agent on a project")
  .argument("<agent>", "Agent ID")
  .argument("[path]", "Project directory", ".")
  .option("--json", "Output as JSON")
  .option("--skip-permissions", "Launch with all permissions bypassed")
  .option("--resume", "Resume the last session for this project")
  .action(
    async (
      agentId: string,
      path: string,
      options: { json?: boolean; skipPermissions?: boolean; resume?: boolean }
    ) => {
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

      const projectDir = resolve(path);

      try {
        const result = await launchAgent({
          agentId,
          projectDir,
          skipPermissions: options.skipPermissions,
          resume: options.resume,
        });
        if (options.json) {
          console.log(
            JSON.stringify(
              { agentId, projectDir, exitCode: result.exitCode ?? 0 },
              null,
              2
            )
          );
        }
        process.exit(result.exitCode ?? 0);
      } catch (err) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (err as Error).message }, null, 2)
          );
          process.exit(1);
        }
        console.error((err as Error).message);
        process.exit(1);
      }
    }
  );
