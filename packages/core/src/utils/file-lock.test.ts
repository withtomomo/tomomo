import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { acquireLock, releaseLock, writeWithLock } from "./file-lock";

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `file-lock-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("acquireLock", () => {
  it("acquires lock on unlocked file", async () => {
    const lockPath = join(testDir, "test.lock");
    const acquired = await acquireLock(lockPath);
    expect(acquired).toBe(true);
    expect(existsSync(lockPath)).toBe(true);
    await releaseLock(lockPath);
  });

  it("fails to acquire already locked file with retries 0", async () => {
    const lockPath = join(testDir, "test.lock");
    // Write an existing fresh lock
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: 99999, timestamp: Date.now() })
    );

    const acquired = await acquireLock(lockPath, {
      retries: 0,
      staleMs: 30000,
    });
    expect(acquired).toBe(false);
  });

  it("breaks stale locks and acquires successfully", async () => {
    const lockPath = join(testDir, "stale.lock");
    // Write a fresh lock file, then wait longer than staleMs before acquiring
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: 99999, timestamp: Date.now() })
    );
    // Wait 200ms so the lock's mtime is older than our staleMs threshold of 100ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    const acquired = await acquireLock(lockPath, { retries: 0, staleMs: 100 });
    expect(acquired).toBe(true);
    await releaseLock(lockPath);
  });
});

describe("writeWithLock", () => {
  it("writes content and releases lock", async () => {
    const filePath = join(testDir, "output.txt");
    const lockPath = filePath + ".lock";

    await writeWithLock(filePath, "hello world");

    expect(readFileSync(filePath, "utf-8")).toBe("hello world");
    // Lock should be released after write
    expect(existsSync(lockPath)).toBe(false);
  });

  it("releases lock even if write fails", async () => {
    // Use a path in a non-existent nested directory that we'll make read-only
    // Instead, simulate by pointing to a directory as the file path
    const dirPath = join(testDir, "cannot-write-here");
    mkdirSync(dirPath);
    const filePath = join(dirPath); // filePath is a directory, writeFile will fail
    const lockPath = filePath + ".lock";

    // writeWithLock should throw but still clean up the lock
    await expect(writeWithLock(filePath, "content")).rejects.toThrow();
    expect(existsSync(lockPath)).toBe(false);
  });
});
