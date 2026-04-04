import { Command } from "commander";
import { resolve } from "node:path";
import { readdir } from "node:fs/promises";
import {
  loadAgent,
  getAgentMemoryPath,
  getAgentProjectsDir,
  getProjectMemoryPath,
  readTextFile,
  fileExists,
  readJsonFile,
  writeWithLock,
  resolveProjectHash,
  basicCompact,
} from "@tomomo/core";
import type { ProjectInfo } from "@tomomo/core";

export const memoryCommand = new Command("memory")
  .description("View agent memory")
  .argument("<agent>", "Agent ID")
  .option("--project [path]", "Show project-specific memory")
  .option("--projects", "List all projects")
  .option("--compact", "Compact memory by summarising older entries")
  .option("--json", "Output as JSON")
  .action(async (agentId: string, options) => {
    const config = await loadAgent(agentId);
    if (!config) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }

    if (options.compact) {
      const memoryPath = getAgentMemoryPath(agentId);
      const memory = await readTextFile(memoryPath);
      if (!memory || !memory.trim()) {
        console.log("No memory to compact.");
        return;
      }

      console.log(
        "Running basic compaction (keeps 5 most recent entries, extracts key facts from older ones)."
      );
      console.log(
        "For smarter compaction, ask your agent to compact its memory during a session."
      );
      const compacted = basicCompact(memory);
      if (compacted === memory) {
        console.log("Memory is already compact.");
        return;
      }

      await writeWithLock(memoryPath, compacted);
      console.log("Memory compacted.");
      return;
    }

    if (options.projects) {
      const projectsDir = getAgentProjectsDir(agentId);
      if (!(await fileExists(projectsDir))) {
        console.log("No projects yet.");
        return;
      }

      const entries = await readdir(projectsDir, { withFileTypes: true });
      const projects: Array<{ hash: string; path: string; remote?: string }> =
        [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const info = await readJsonFile<ProjectInfo>(
          resolve(projectsDir, entry.name, "project.json")
        );
        if (info) {
          projects.push({ hash: entry.name, ...info });
        }
      }

      if (options.json) {
        console.log(JSON.stringify(projects, null, 2));
        return;
      }

      if (projects.length === 0) {
        console.log("No projects yet.");
        return;
      }

      for (const p of projects) {
        console.log(`  ${p.hash} ${p.path}${p.remote ? ` (${p.remote})` : ""}`);
      }
      return;
    }

    if (options.project !== undefined) {
      const projectPath =
        typeof options.project === "string"
          ? resolve(options.project)
          : resolve(".");
      const hash = await resolveProjectHash(projectPath);
      const memory = await readTextFile(getProjectMemoryPath(agentId, hash));

      if (options.json) {
        console.log(
          JSON.stringify(
            { project: projectPath, hash, memory: memory ?? "" },
            null,
            2
          )
        );
        return;
      }

      if (!memory) {
        console.log("No project memory yet.");
        return;
      }

      console.log(memory);
      return;
    }

    // Default: show agent-wide memory
    const memory = await readTextFile(getAgentMemoryPath(agentId));

    if (options.json) {
      console.log(JSON.stringify({ memory: memory ?? "" }, null, 2));
      return;
    }

    if (!memory || !memory.trim()) {
      console.log("No memory yet.");
      return;
    }

    console.log(memory);
  });
