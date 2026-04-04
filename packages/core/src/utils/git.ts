import { execFile } from "node:child_process";

export function getGitRemoteUrl(dir: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "git",
      ["remote", "get-url", "origin"],
      { cwd: dir },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const url = stdout.trim();
        resolve(url || null);
      }
    );
  });
}
