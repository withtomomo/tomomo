import type { GitHubSource, FetchedFile } from "../types";

interface GitHubContentItem {
  name: string;
  type: "file" | "dir";
  download_url: string | null;
  path: string;
}

export function parseGitHubSource(source: string): GitHubSource {
  const parts = source.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid GitHub source "${source}". Expected "owner/repo" or "owner/repo/path".`
    );
  }
  const owner = parts[0];
  const repo = parts[1];
  const path = parts.slice(2).join("/");
  return { owner, repo, path };
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  // Use GITHUB_TOKEN for higher rate limits (60/hr unauthenticated vs 5000/hr authenticated)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchDirectory(
  owner: string,
  repo: string,
  path: string
): Promise<GitHubContentItem[]> {
  const encodedPath = path
    ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}`
    : "";
  const url = `https://api.github.com/repos/${owner}/${repo}/contents${encodedPath}`;
  const response = await fetch(url, {
    headers: getGitHubHeaders(),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} for ${url}`);
  }
  return response.json() as Promise<GitHubContentItem[]>;
}

async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} for ${downloadUrl}`
    );
  }
  return response.text();
}

export async function fetchAgentFiles(
  source: GitHubSource
): Promise<FetchedFile[]> {
  const { owner, repo, path: basePath } = source;

  // Phase 1: Collect all file entries by recursing directories in parallel
  const fileEntries: Array<{ relPath: string; downloadUrl: string }> = [];

  async function collectFiles(
    dirPath: string,
    relativeBase: string
  ): Promise<void> {
    const items = await fetchDirectory(owner, repo, dirPath);
    const subDirs: Array<{ path: string; relPath: string }> = [];
    for (const item of items) {
      const relPath = relativeBase ? `${relativeBase}/${item.name}` : item.name;
      if (item.type === "file" && item.download_url) {
        fileEntries.push({ relPath, downloadUrl: item.download_url });
      } else if (item.type === "dir") {
        subDirs.push({ path: item.path, relPath });
      }
    }
    await Promise.all(subDirs.map((d) => collectFiles(d.path, d.relPath)));
  }

  await collectFiles(basePath, "");

  // Phase 2: Download all files in parallel
  const results = await Promise.all(
    fileEntries.map(async (entry) => {
      const content = await fetchFileContent(entry.downloadUrl);
      return { path: entry.relPath, content };
    })
  );

  return results;
}
