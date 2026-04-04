import { Command } from "commander";
import { cloneAgent, agentExists, slugifyName } from "@tomomo/core";

export const cloneCommand = new Command("clone")
  .description("Clone an agent (copies soul and skills, not project memories)")
  .argument("<agent>", "Source agent ID")
  .argument("<new-name>", "Name for the new agent")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, newName: string, options) => {
    if (!(await agentExists(agentId))) {
      console.error(
        `Agent "${agentId}" not found. Run 'tomomo list' to see your agents.`
      );
      process.exit(1);
    }

    const newId = slugifyName(newName);
    if (await agentExists(newId)) {
      console.error(`Agent "${newId}" already exists.`);
      process.exit(1);
    }
    const config = await cloneAgent(agentId, newId, newName);

    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(
        `Agent "${config.name}" created from "${agentId}" (${config.id})`
      );
    }
  });
