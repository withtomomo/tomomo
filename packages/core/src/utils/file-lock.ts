import { open, unlink, writeFile, stat, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

interface LockData {
  pid: number;
  timestamp: number;
}

interface AcquireLockOptions {
  retries?: number;
  retryDelayMs?: number;
  staleMs?: number;
}

const DEFAULTS = {
  retries: 3,
  retryDelayMs: 200,
  staleMs: 30000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireLock(
  lockPath: string,
  options?: AcquireLockOptions
): Promise<boolean> {
  const retries = options?.retries ?? DEFAULTS.retries;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULTS.retryDelayMs;
  const staleMs = options?.staleMs ?? DEFAULTS.staleMs;

  await mkdir(dirname(lockPath), { recursive: true });

  // Hard ceiling prevents infinite loops from stale lock re-creation
  const maxIterations = (retries + 1) * 3;
  let iterations = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (++iterations > maxIterations) break;

    try {
      // "wx" flag: create exclusively, fail if exists
      const handle = await open(lockPath, "wx");
      const lockData: LockData = { pid: process.pid, timestamp: Date.now() };
      await handle.writeFile(JSON.stringify(lockData), "utf-8");
      await handle.close();
      return true;
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== "EEXIST") {
        throw err;
      }

      // Lock exists, check if it's stale
      try {
        const stats = await stat(lockPath);
        const age = Date.now() - stats.mtimeMs;
        if (age > staleMs) {
          // Stale lock, remove it and retry without consuming an attempt
          await releaseLock(lockPath);
          attempt--;
          continue;
        }
      } catch {
        // Lock was removed between the EEXIST and the stat, retry
        attempt--;
        continue;
      }

      // Fresh lock, wait before retry with exponential backoff + jitter
      if (attempt < retries) {
        const backoff = retryDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * retryDelayMs;
        await sleep(backoff + jitter);
      }
    }
  }

  return false;
}

export async function releaseLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Ignore errors on release
  }
}

export async function writeWithLock(
  filePath: string,
  content: string,
  options?: AcquireLockOptions
): Promise<void> {
  const lockPath = filePath + ".lock";
  const acquired = await acquireLock(lockPath, options);

  if (!acquired) {
    throw new Error(
      `Could not acquire lock for ${filePath}: another process is writing`
    );
  }

  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
  } finally {
    await releaseLock(lockPath);
  }
}
