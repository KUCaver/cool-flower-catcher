const STORAGE_KEY = "cool-flower-catcher-rankings";
const MAX_RANKINGS = 10;

export type RankingEntry = {
  id: string;
  nickname: string;
  score: number;
  title: string;
  bestCombo: number;
  caught: number;
  createdAt: string;
};

export function loadRankings(): RankingEntry[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRankingEntry)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RANKINGS);
  } catch {
    return [];
  }
}

export function saveRankingEntry(entry: Omit<RankingEntry, "id" | "createdAt">) {
  const nextEntry: RankingEntry = {
    ...entry,
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
  };
  const rankings = [nextEntry, ...loadRankings()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RANKINGS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
  return rankings;
}

export function normalizeNickname(value: string) {
  return value.trim().replace(/\s+/g, "").slice(0, 6);
}

function isRankingEntry(value: unknown): value is RankingEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as RankingEntry;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.nickname === "string" &&
    typeof candidate.score === "number" &&
    typeof candidate.title === "string" &&
    typeof candidate.bestCombo === "number" &&
    typeof candidate.caught === "number" &&
    typeof candidate.createdAt === "string"
  );
}
