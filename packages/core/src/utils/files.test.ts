import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readJsonFile,
  writeJsonFile,
  readTextFile,
  writeTextFile,
  ensureDir,
  fileExists,
} from "./files";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("files", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("ensureDir creates nested directories", async () => {
    const nested = join(testDir, "a", "b", "c");
    await ensureDir(nested);
    expect(await fileExists(nested)).toBe(true);
  });

  it("writeJsonFile and readJsonFile roundtrip", async () => {
    const path = join(testDir, "test.json");
    const data = { name: "test", value: 42 };
    await writeJsonFile(path, data);
    const result = await readJsonFile(path);
    expect(result).toEqual(data);
  });

  it("readJsonFile returns null for missing file", async () => {
    const result = await readJsonFile(join(testDir, "missing.json"));
    expect(result).toBeNull();
  });

  it("writeTextFile and readTextFile roundtrip", async () => {
    const path = join(testDir, "test.md");
    await writeTextFile(path, "hello world");
    const result = await readTextFile(path);
    expect(result).toBe("hello world");
  });

  it("readTextFile returns null for missing file", async () => {
    const result = await readTextFile(join(testDir, "missing.md"));
    expect(result).toBeNull();
  });

  it("fileExists returns false for missing paths", async () => {
    expect(await fileExists(join(testDir, "nope"))).toBe(false);
  });

  it("readJsonFile throws on malformed JSON", async () => {
    const path = join(testDir, "bad.json");
    await writeTextFile(path, "not valid json {{{");
    await expect(readJsonFile(path)).rejects.toThrow();
  });
});
