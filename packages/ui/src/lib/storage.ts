const PREFIX = "tomomo-";

export function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable, ignore
  }
}

export function removeStoredValue(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore
  }
}
