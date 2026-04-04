import { Command } from "commander";
import { readdir, cp, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import {
  agentExists,
  getAgentSkillsDir,
  fileExists,
  ensureDir,
} from "@tomomo/core";

// Helper to get the agent ID from the parent command's parsed arguments
function getAgentId(cmd: Command): string {
  const parent = cmd.parent;
  if (!parent) throw new Error("Skills command must have a parent");
  return parent.args[0]!;
}

async function listSkills(agentId: string, json: boolean): Promise<void> {
  const skillsDir = getAgentSkillsDir(agentId);
  if (!(await fileExists(skillsDir))) {
    if (json) {
      console.log(JSON.stringify([], null, 2));
    } else {
      console.log("No skills equipped.");
    }
    return;
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (json) {
    console.log(JSON.stringify(skills, null, 2));
  } else if (skills.length === 0) {
    console.log("No skills equipped.");
  } else {
    for (const skill of skills) {
      console.log(`  ${skill}`);
    }
  }
}

export const skillsCommand = new Command("skills")
  .description("Manage agent skills")
  .argument("<agent>", "Agent ID")
  .option("--json", "Output as JSON")
  .action(async (agentId, options) => {
    // Default action: list skills
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }

    await listSkills(agentId, options.json);
  });

skillsCommand
  .command("list")
  .description("List equipped skills")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, options) {
    const agentId = getAgentId(this);
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }

    await listSkills(agentId, options.json);
  });

skillsCommand
  .command("add")
  .description("Add a skill from a directory")
  .argument("<path>", "Path to skill directory (must contain SKILL.md)")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, skillPath, options) {
    const agentId = getAgentId(this);
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }

    const skillMdPath = join(skillPath, "SKILL.md");
    if (!(await fileExists(skillMdPath))) {
      console.error(`No SKILL.md found in "${skillPath}".`);
      process.exit(1);
    }

    const skillName = basename(skillPath);
    const destDir = join(getAgentSkillsDir(agentId), skillName);

    if (await fileExists(destDir)) {
      console.error(
        `Skill "${skillName}" is already equipped. Remove it first.`
      );
      process.exit(1);
    }

    await ensureDir(getAgentSkillsDir(agentId));
    await cp(skillPath, destDir, { recursive: true });

    if (options.json) {
      console.log(JSON.stringify({ added: skillName }, null, 2));
    } else {
      console.log(`Skill "${skillName}" added to agent "${agentId}".`);
    }
  });

skillsCommand
  .command("remove")
  .description("Remove an equipped skill")
  .argument("<name>", "Skill name to remove")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, skillName, options) {
    const agentId = getAgentId(this);
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }

    const skillDir = join(getAgentSkillsDir(agentId), skillName);
    if (!(await fileExists(skillDir))) {
      console.error(`Skill "${skillName}" is not equipped.`);
      process.exit(1);
    }

    await rm(skillDir, { recursive: true, force: true });

    if (options.json) {
      console.log(JSON.stringify({ removed: skillName }, null, 2));
    } else {
      console.log(`Skill "${skillName}" removed from agent "${agentId}".`);
    }
  });
