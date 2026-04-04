import { Command } from "commander";
import { listAgents } from "@tomomo/core";

export const listCommand = new Command("list")
  .description("List all agents")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const agents = await listAgents();

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    if (agents.length === 0) {
      console.log(
        "No agents yet. Run 'tomomo create --name <name>' to create one."
      );
      return;
    }

    for (const agent of agents) {
      const model = agent.model ? ` (${agent.model})` : "";
      console.log(
        `  ${agent.name} [${agent.id}] ${agent.runtime}${model} ${agent.launchCount} launches`
      );
    }
  });
