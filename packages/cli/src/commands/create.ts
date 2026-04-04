import { Command } from "commander";
import {
  createAgent,
  slugifyName,
  agentExists,
  readTextFile,
  writeTextFile,
  getAgentSoulPath,
} from "@tomomo/core";

export const createCommand = new Command("create")
  .description("Create a new agent")
  .option("--name <name>", "Agent name")
  .option("--model <model>", "Model preference")
  .option("--runtime <runtime>", "Runtime adapter", "claude-code")
  .option("--prompt <path>", "Path to soul.md file")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    let name = options.name;

    if (!name) {
      const readline = await import("node:readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      name = await new Promise<string>((resolve) => {
        rl.question("Agent name: ", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    }

    if (!name) {
      console.error("Agent name is required.");
      process.exit(1);
    }

    const id = slugifyName(name);

    if (await agentExists(id)) {
      console.error(`Agent "${id}" already exists.`);
      process.exit(1);
    }

    let soulContent: string | undefined;
    if (options.prompt) {
      soulContent = (await readTextFile(options.prompt)) ?? undefined;
      if (!soulContent) {
        console.error(`Could not read prompt file: ${options.prompt}`);
        process.exit(1);
      }
    }

    const config = await createAgent(id, name, {
      runtime: options.runtime,
      model: options.model,
    });

    if (soulContent) {
      await writeTextFile(getAgentSoulPath(id), soulContent);
    }

    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(`Agent "${config.name}" created (${config.id})`);
    }
  });
