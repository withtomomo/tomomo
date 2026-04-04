import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseGitHubSource, fetchAgentFiles } from "./github";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("parseGitHubSource", () => {
  it("parses owner/repo into owner, repo, and empty path", () => {
    const result = parseGitHubSource("myorg/myrepo");
    expect(result).toEqual({ owner: "myorg", repo: "myrepo", path: "" });
  });

  it("parses owner/repo/path into owner, repo, and path", () => {
    const result = parseGitHubSource("myorg/myrepo/agents/webdev");
    expect(result).toEqual({
      owner: "myorg",
      repo: "myrepo",
      path: "agents/webdev",
    });
  });

  it("parses deep nested paths correctly", () => {
    const result = parseGitHubSource("org/repo/a/b/c/d");
    expect(result).toEqual({ owner: "org", repo: "repo", path: "a/b/c/d" });
  });

  it("throws on invalid source with no slash", () => {
    expect(() => parseGitHubSource("justarepo")).toThrow(
      'Invalid GitHub source "justarepo"'
    );
  });
});

describe("fetchAgentFiles", () => {
  it("fetches files from a repo root", async () => {
    // Directory listing for root
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          name: "agent.json",
          type: "file",
          download_url: "https://raw.github.com/agent.json",
          path: "agent.json",
        },
        {
          name: "soul.md",
          type: "file",
          download_url: "https://raw.github.com/soul.md",
          path: "soul.md",
        },
      ],
    });

    // File downloads
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{"id":"test"}',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "# My Agent",
    });

    const files = await fetchAgentFiles({
      owner: "myorg",
      repo: "myrepo",
      path: "",
    });

    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({ path: "agent.json", content: '{"id":"test"}' });
    expect(files[1]).toEqual({ path: "soul.md", content: "# My Agent" });
  });

  it("recursively fetches subdirectories", async () => {
    // Phase 1 collects directories, phase 2 downloads files in parallel.
    // Mock order: root dir listing, skills dir listing, then file downloads.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          name: "agent.json",
          type: "file",
          download_url: "https://raw.github.com/agent.json",
          path: "agent.json",
        },
        {
          name: "skills",
          type: "dir",
          download_url: null,
          path: "skills",
        },
      ],
    });

    // Subdirectory listing for "skills" (phase 1)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          name: "coding.md",
          type: "file",
          download_url: "https://raw.github.com/skills/coding.md",
          path: "skills/coding.md",
        },
      ],
    });

    // File downloads (phase 2, parallel)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{"id":"test"}',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "# Coding Skill",
    });

    const files = await fetchAgentFiles({
      owner: "myorg",
      repo: "myrepo",
      path: "",
    });

    expect(files).toHaveLength(2);
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(["agent.json", "skills/coding.md"]);
  });

  it("throws on GitHub API error (404)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(
      fetchAgentFiles({ owner: "myorg", repo: "missing-repo", path: "" })
    ).rejects.toThrow("GitHub API error: 404");
  });
});
