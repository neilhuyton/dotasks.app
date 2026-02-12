// src/utils/goalCache.ts   (new file – symmetric to weightCache)

const GOAL_CACHE_KEY = "latest_goal_cache";

interface CachedGoal {
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: string | null;
}

export function saveCurrentGoal(goal: CachedGoal) {
  try {
    localStorage.setItem(GOAL_CACHE_KEY, JSON.stringify(goal));
  } catch {
     // Non-critical: ignore localStorage errors (quota, private mode, etc.)
  }
}

export function getCachedCurrentGoal(): CachedGoal | null {
  try {
    const item = localStorage.getItem(GOAL_CACHE_KEY);
    if (!item) return null;
    return JSON.parse(item) as CachedGoal;
  } catch {
    return null;
  }
}

export function clearCurrentGoalCache() {
  localStorage.removeItem(GOAL_CACHE_KEY);
}