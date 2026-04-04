import {
  readdir,
  readFile,
  cp,
  stat,
  writeFile,
  mkdir,
  rm,
} from "node:fs/promises";
import { join, basename, resolve, isAbsolute, dirname } from "node:path";
import { getAgentSkillsDir } from "../paths";
import { ensureDir } from "../utils/files";
import { parseGitHubSource, fetchAgentFiles } from "../github/github";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  content: string;
}

// Extracts name and description from YAML frontmatter (---\n...\n---).
function parseSkillFrontmatter(content: string): {
  name?: string;
  description?: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const block = match[1] ?? "";
  const result: { name?: string; description?: string } = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2];
    if (key === "name" && value) result.name = value.trim();
    if (key === "description" && value) result.description = value.trim();
  }
  return result;
}

export async function listAgentSkills(agentId: string): Promise<AgentSkill[]> {
  const skillsDir = getAgentSkillsDir(agentId);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills: AgentSkill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
    let content = "";
    try {
      content = await readFile(skillMdPath, "utf-8");
    } catch {
      // Return entry with empty content on read error
    }
    const { name, description } = parseSkillFrontmatter(content);
    skills.push({
      id: entry.name,
      name: name ?? entry.name,
      description: description ?? "",
      content,
    });
  }
  return skills;
}

export async function removeAgentSkill(
  agentId: string,
  skillId: string
): Promise<void> {
  const skillsDir = getAgentSkillsDir(agentId);
  const target = resolve(join(skillsDir, skillId));
  if (!target.startsWith(skillsDir + "/")) {
    throw new Error("Invalid skill ID");
  }
  await rm(target, { recursive: true, force: true });
}

export async function addAgentSkill(
  agentId: string,
  sourcePath: string
): Promise<{ id: string; name: string }> {
  if (!isAbsolute(sourcePath) || resolve(sourcePath) !== sourcePath) {
    throw new Error(
      `Invalid source path "${sourcePath}". Must be an absolute, resolved path with no traversal.`
    );
  }

  // Validate SKILL.md exists at source
  await stat(join(sourcePath, "SKILL.md"));

  const id = basename(sourcePath);
  if (!id || id === "." || id === "..") {
    throw new Error("Invalid source path: cannot derive skill ID");
  }
  const destPath = join(getAgentSkillsDir(agentId), id);
  await cp(sourcePath, destPath, { recursive: true });

  const content = await readFile(join(destPath, "SKILL.md"), "utf-8");
  const { name } = parseSkillFrontmatter(content);

  return { id, name: name ?? id };
}

export async function installSkillFromGitHub(
  agentId: string,
  source: string
): Promise<{ id: string; name: string }> {
  const parsed = parseGitHubSource(source.trim());
  const files = await fetchAgentFiles(parsed);

  const skillMdFile = files.find((f) => f.path === "SKILL.md");
  if (!skillMdFile) {
    throw new Error(
      `No SKILL.md found in the GitHub source "${source}". Make sure the path points to a skill directory.`
    );
  }

  // Extract skill ID from last segment of the source path
  const pathParts = parsed.path ? parsed.path.split("/") : [];
  const rawId = pathParts[pathParts.length - 1] || parsed.repo;

  // Sanitize: lowercase, replace non-alphanumeric with -, ensure starts with letter/digit
  let id = rawId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");

  if (!id || !/^[a-z0-9]/.test(id)) {
    id = `skill-${id || "unknown"}`;
  }

  const { name } = parseSkillFrontmatter(skillMdFile.content);

  const destDir = join(getAgentSkillsDir(agentId), id);
  await ensureDir(destDir);

  for (const file of files) {
    const filePath = resolve(join(destDir, file.path));
    // Guard against path traversal
    if (!filePath.startsWith(destDir + "/") && filePath !== destDir) {
      throw new Error(
        `Path traversal detected for file "${file.path}". Aborting skill install.`
      );
    }
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }

  return { id, name: name ?? id };
}
