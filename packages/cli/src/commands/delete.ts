import { Command } from "commander";
import { deleteAgent, loadAgent } from "@tomomo/core";

export const deleteCommand = new Command("delete")
  .description("Delete an agent")
  .argument("<agent>", "Agent ID")
  .option("--force", "Skip confirmation")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, options) => {
    const config = await loadAgent(agentId);
    if (!config) {
      console.error(
        `Agent "${agentId}" not found. Run 'tomomo list' to see your agents.`
      );
      process.exit(1);
    }

    if (!options.force) {
      const readline = await import("node:readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise<string>((resolve) => {
        rl.question(
          `Delete agent "${config.name}" (${config.id})? This cannot be undone. (y/N) `,
          resolve
        );
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        console.log("Cancelled.");
        process.exit(0);
      }
    }

    await deleteAgent(agentId);

    if (options.json) {
      console.log(JSON.stringify({ deleted: agentId }, null, 2));
    } else {
      console.log(`Agent "${config.name}" deleted.`);
    }
  });
