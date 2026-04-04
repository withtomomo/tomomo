import { Command } from "commander";
import { dirname, join, resolve } from "node:path";
import {
  parseGitHubSource,
  fetchAgentFiles,
  slugifyName,
  agentExists,
  createAgent,
  getAgentSoulPath,
  getAgentSkillsDir,
  writeTextFile,
  ensureDir,
} from "@tomomo/core";

interface RemoteAgentJson {
  name?: string;
  description?: string;
  runtime?: string;
  model?: string;
}

export const installCommand = new Command("install")
  .description("Install an agent from GitHub")
  .argument("<source>", "GitHub source: owner/repo or owner/repo/path/to/agent")
  .option("--name <name>", "Override agent name")
  .option("--json", "Output as JSON")
  .action(
    async (source: string, options: { name?: string; json?: boolean }) => {
      let parsed;
      try {
        parsed = parseGitHubSource(source);
      } catch (err) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (err as Error).message }, null, 2)
          );
        } else {
          console.error((err as Error).message);
        }
        process.exit(1);
      }

      if (!options.json) {
        console.log(`Fetching agent from ${source}...`);
      }

      let files;
      try {
        files = await fetchAgentFiles(parsed);
      } catch (err) {
        if (options.json) {
          console.log(
            JSON.stringify({ error: (err as Error).message }, null, 2)
          );
        } else {
          console.error(
            `Failed to fetch agent files: ${(err as Error).message}`
          );
        }
        process.exit(1);
      }

      const agentJsonFile = files.find((f) => f.path === "agent.json");
      const soulFile = files.find((f) => f.path === "soul.md");

      if (!agentJsonFile) {
        const msg = "Remote agent is missing agent.json.";
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      if (!soulFile) {
        const msg = "Remote agent is missing soul.md.";
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      let remoteConfig: RemoteAgentJson;
      try {
        remoteConfig = JSON.parse(agentJsonFile.content) as RemoteAgentJson;
      } catch {
        const msg = "Remote agent.json is not valid JSON.";
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      const agentName = options.name ?? remoteConfig.name;
      if (!agentName) {
        const msg =
          "Could not determine agent name. Use --name to specify one.";
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      const agentId = slugifyName(agentName);

      if (await agentExists(agentId)) {
        const msg = `Agent "${agentId}" already exists.`;
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.error(msg);
        }
        process.exit(1);
      }

      const config = await createAgent(agentId, agentName, {
        description: remoteConfig.description,
        runtime: remoteConfig.runtime,
        model: remoteConfig.model,
      });

      // Overwrite the default soul.md with the remote one
      await writeTextFile(getAgentSoulPath(agentId), soulFile.content);

      // Write skill files with path traversal protection
      const skillFiles = files.filter(
        (f) => f.path.startsWith("skills/") && f.path !== "skills/"
      );
      const skillsBase = resolve(getAgentSkillsDir(agentId));
      for (const sf of skillFiles) {
        const relativePath = sf.path.replace("skills/", "");
        const destPath = resolve(join(skillsBase, relativePath));
        // Reject paths that escape the skills directory
        if (!destPath.startsWith(skillsBase + "/")) {
          console.error(`Skipping unsafe path: ${sf.path}`);
          continue;
        }
        const dir = dirname(destPath);
        await ensureDir(dir);
        await writeTextFile(destPath, sf.content);
      }

      if (options.json) {
        console.log(
          JSON.stringify({ installed: agentId, source, config }, null, 2)
        );
      } else {
        console.log(
          `Agent "${config.name}" installed from ${source} (${config.id})`
        );
        console.log(`Run 'tomomo launch ${agentId} .' to get started.`);
      }
    }
  );
