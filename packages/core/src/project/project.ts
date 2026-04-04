import {
  getProjectDir,
  getProjectInfoPath,
  getProjectMemoryPath,
} from "../paths";
import {
  ensureDir,
  fileExists,
  readJsonFile,
  writeJsonFile,
  writeTextFile,
} from "../utils/files";
import { shortHash } from "../utils/hash";
import { getGitRemoteUrl } from "../utils/git";
import type { ProjectInfo } from "../types";

export async function resolveProjectHash(
  projectPath: string,
  remoteUrl?: string | null
): Promise<string> {
  const input =
    remoteUrl !== undefined
      ? (remoteUrl ?? projectPath)
      : ((await getGitRemoteUrl(projectPath)) ?? projectPath);
  return shortHash(input);
}

export async function ensureProject(
  agentId: string,
  projectPath: string
): Promise<string> {
  const remote = await getGitRemoteUrl(projectPath);
  const hash = await resolveProjectHash(projectPath, remote);
  const dir = getProjectDir(agentId, hash);

  if (!(await fileExists(dir))) {
    await ensureDir(dir);
    const info: ProjectInfo = { path: projectPath };
    if (remote) {
      info.remote = remote;
    }
    await writeJsonFile(getProjectInfoPath(agentId, hash), info);
    await writeTextFile(
      getProjectMemoryPath(agentId, hash),
      "## Summary\n\n## Recent\n"
    );
  } else {
    // Update path in case the local checkout moved
    const infoPath = getProjectInfoPath(agentId, hash);
    const existing = await readJsonFile<ProjectInfo>(infoPath);
    if (existing && existing.path !== projectPath) {
      existing.path = projectPath;
      await writeJsonFile(infoPath, existing);
    }
  }

  return hash;
}
