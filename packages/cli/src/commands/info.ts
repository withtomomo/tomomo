import { Command } from "commander";
import {
  loadAgent,
  genCharacter,
  renderCharacterToTerminal,
} from "@tomomo/core";

export const infoCommand = new Command("info")
  .description("Show agent details")
  .argument("<agent>", "Agent ID")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, options) => {
    const config = await loadAgent(agentId);
    if (!config) {
      console.error(
        `Agent "${agentId}" not found. Run 'tomomo list' to see your agents.`
      );
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    const character = genCharacter(config.seed || config.id);
    console.log(renderCharacterToTerminal(character));
    console.log(`  ${config.name} (${config.id})`);
    console.log(`  ${config.description || "No description"}`);
    console.log(
      `  Runtime: ${config.runtime}${config.model ? `, Model: ${config.model}` : ""}`
    );
    console.log(`  Launches: ${config.launchCount}`);
    console.log(`  Created: ${config.createdAt}`);
    console.log(`  Last used: ${config.lastUsed}`);
  });
