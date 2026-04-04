import { Command } from "commander";
import { resolve } from "node:path";
import { exportAgent } from "@tomomo/core";

export const exportCommand = new Command("export")
  .description("Export an agent to a folder (without project memories)")
  .argument("<agent>", "Agent ID")
  .option("-o, --output <path>", "Output directory", ".")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, options) => {
    const outputDir = resolve(options.output);

    try {
      const exportedPath = await exportAgent(agentId, outputDir);

      if (options.json) {
        console.log(
          JSON.stringify({ exported: agentId, path: exportedPath }, null, 2)
        );
      } else {
        console.log(`Exported "${agentId}" to ${exportedPath}`);
      }
    } catch (err) {
      console.error(`Export failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });
