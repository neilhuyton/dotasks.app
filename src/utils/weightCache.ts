// src/utils/weightCache.ts

interface CachedLatestWeight {
  weightKg: number;
  createdAt: string; // ISO string
  timestamp: number; // for potential staleness check
}

const STORAGE_KEY = 'latest_weight_cache';

export function saveLatestWeight(entry: { weightKg: number; createdAt: string }): void {
  const cache: CachedLatestWeight = {
    weightKg: entry.weightKg,
    createdAt: entry.createdAt,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function getCachedLatestWeight(): CachedLatestWeight | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedLatestWeight;
    // Optional: invalidate if older than e.g. 48 hours
    // if (Date.now() - parsed.timestamp > 48 * 60 * 60 * 1000) {
    //   localStorage.removeItem(STORAGE_KEY);
    //   return null;
    // }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearLatestWeightCache(): void {
  localStorage.removeItem(STORAGE_KEY);
}