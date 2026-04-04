import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  getUserMdPath,
  getAgentSoulPath,
  getAgentMemoryPath,
  getAgentDir,
  getAgentSkillsDir,
  getProjectMemoryPath,
} from "../paths";
import { readTextFile, writeTextFile } from "../utils/files";
import { truncateWithinBudget, isValidMemoryFormat } from "./budget";
import type { AssembleContextOptions } from "../types";

// Module-level cache for the bundled tomomo-self skill content.
// Safe for CLI (single invocation per process). In long-lived processes
// (desktop main, VS Code extension host), call clearSkillCache() if the
// skill file may have changed on disk.
let cachedSkillContent: string | null = null;

export function clearSkillCache(): void {
  cachedSkillContent = null;
}

async function getSkillContent(): Promise<string> {
  if (cachedSkillContent !== null) return cachedSkillContent;

  const paths = [
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "skills",
      "tomomo-self",
      "SKILL.md"
    ),
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "skills",
      "tomomo-self",
      "SKILL.md"
    ),
  ];

  for (const p of paths) {
    try {
      const content = await readFile(p, "utf-8");
      const body = content.replace(/^---[\s\S]*?---\n*/, "").trim();
      if (body) {
        cachedSkillContent = body;
        return body;
      }
    } catch {
      // try next path
    }
  }

  cachedSkillContent = "";
  return "";
}

async function readMemorySafe(memoryPath: string): Promise<string | null> {
  const content = await readTextFile(memoryPath);
  if (content === null) return null;

  if (isValidMemoryFormat(content)) return content;

  // Memory is corrupt. Backup and reset.
  const backupPath = memoryPath.replace(/\.md$/, ".corrupted.bak");
  await writeTextFile(backupPath, content);
  const fresh = "## Summary\n\n## Recent\n";
  await writeTextFile(memoryPath, fresh);
  console.warn(
    `Warning: corrupt memory detected. Backed up to ${backupPath} and reset.`
  );
  return fresh;
}

export async function assembleContext(
  options: AssembleContextOptions
): Promise<string> {
  const {
    agentId,
    projectHash,
    projectPath,
    agentMemoryBudget,
    projectMemoryBudget,
    sessionId,
  } = options;

  const parts: string[] = [];

  // 1. Tomomo context header
  const agentDir = getAgentDir(agentId);
  const headerLines = [
    "[Tomomo Agent Context]",
    `Agent directory: ${agentDir}`,
  ];
  if (projectHash) {
    headerLines.push(`Current project: ${agentDir}/projects/${projectHash}`);
  }
  headerLines.push(`Current project path: ${projectPath}`);
  if (sessionId) {
    headerLines.push(`Session memory: ${agentDir}/session-${sessionId}.md`);
    if (projectHash) {
      headerLines.push(
        `Project session memory: ${agentDir}/projects/${projectHash}/session-${sessionId}.md`
      );
    }
  }
  parts.push(headerLines.join("\n"));

  // 2. User preferences
  const userMdPath = getUserMdPath();
  const userMd = await readTextFile(userMdPath);
  if (userMd && userMd.trim()) {
    parts.push(`[User Preferences]\n${userMd.trim()}`);
  }

  // 3. Soul.md (no label, no truncation)
  const soulPath = getAgentSoulPath(agentId);
  const soul = await readTextFile(soulPath);
  if (soul && soul.trim()) {
    parts.push(soul.trim());
  }

  // 4. Agent memory.md (truncated within budget)
  const agentMemoryPath = getAgentMemoryPath(agentId);
  const agentMemory = await readMemorySafe(agentMemoryPath);
  if (agentMemory && agentMemory.trim()) {
    const truncated = truncateWithinBudget(
      agentMemory.trim(),
      agentMemoryBudget
    );
    parts.push(`[Agent Memory]\n${truncated}`);
  }

  // 5. Project memory.md (truncated within budget)
  if (projectHash) {
    const projectMemoryPath = getProjectMemoryPath(agentId, projectHash);
    const projectMemory = await readMemorySafe(projectMemoryPath);
    if (projectMemory && projectMemory.trim()) {
      const truncated = truncateWithinBudget(
        projectMemory.trim(),
        projectMemoryBudget
      );
      parts.push(`[Project Memory]\n${truncated}`);
    }
  }

  // 6. Tomomo skill instructions (bundled with the CLI package)
  const skillContent = await getSkillContent();
  if (skillContent) {
    parts.push("[Tomomo Skill]");
    parts.push(skillContent);
  }

  // 7. Equipped skills
  const equippedSkills = await loadEquippedSkills(agentId);
  for (const skill of equippedSkills) {
    parts.push(`[Skill: ${skill.name}]\n${skill.content}`);
  }

  return parts.join("\n\n");
}

async function loadEquippedSkills(
  agentId: string
): Promise<Array<{ name: string; content: string }>> {
  const skillsDir = getAgentSkillsDir(agentId);
  let entries: string[];
  try {
    const dirEntries = await readdir(skillsDir, { withFileTypes: true });
    entries = dirEntries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }

  const skills: Array<{ name: string; content: string }> = [];
  for (const entry of entries) {
    const skillMdPath = join(skillsDir, entry, "SKILL.md");
    try {
      const raw = await readFile(skillMdPath, "utf-8");
      const body = raw.replace(/^---[\s\S]*?---\n*/, "").trim();
      if (body) {
        skills.push({ name: entry, content: body });
      }
    } catch {
      // skip skills without a valid SKILL.md
    }
  }
  return skills;
}
