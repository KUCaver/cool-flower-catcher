import type { FlowerKind, GamePhase } from "./types";

export const GAME_CONFIG = {
  durationMs: 30_000,
  feverDurationMs: 5_000,
  grabBufferMs: 150,
  baseHitboxMultiplier: 1.35,
  playArea: {
    xMin: 0.15,
    xMax: 0.85,
    yMin: 0.18,
    yMax: 0.82,
  },
  phaseStartsMs: {
    rush: 10_000,
  },
  maxFlowersByPhase: {
    opening: 2,
    rush: 3,
    fever: 4,
  } satisfies Record<GamePhase, number>,
  spawnDelayByPhase: {
    opening: { min: 820, max: 1080 },
    rush: { min: 640, max: 880 },
    fever: { min: 420, max: 620 },
  } satisfies Record<GamePhase, { min: number; max: number }>,
  feedbackTtlMs: 850,
} as const;

export type FlowerTypeConfig = {
  kind: FlowerKind;
  label: string;
  points: number;
  radius: number;
  lifeMs: number;
  color: string;
  accentColor: string;
  spawnWeights: Record<GamePhase, number>;
};

export const FLOWER_TYPES: Record<FlowerKind, FlowerTypeConfig> = {
  basic: {
    kind: "basic",
    label: "기본꽃",
    points: 10,
    radius: 46,
    lifeMs: 1900,
    color: "#ff7aae",
    accentColor: "#ffe27a",
    spawnWeights: {
      opening: 72,
      rush: 50,
      fever: 42,
    },
  },
  spark: {
    kind: "spark",
    label: "반짝꽃",
    points: 30,
    radius: 42,
    lifeMs: 1450,
    color: "#ffd856",
    accentColor: "#8b5b13",
    spawnWeights: {
      opening: 18,
      rush: 26,
      fever: 34,
    },
  },
  coollower: {
    kind: "coollower",
    label: "쿨라워꽃",
    points: 50,
    radius: 50,
    lifeMs: 1250,
    color: "#7cf6bd",
    accentColor: "#0f7b4a",
    spawnWeights: {
      opening: 10,
      rush: 12,
      fever: 18,
    },
  },
  wilted: {
    kind: "wilted",
    label: "시든꽃",
    points: -10,
    radius: 48,
    lifeMs: 1700,
    color: "#8d7480",
    accentColor: "#513a44",
    spawnWeights: {
      opening: 0,
      rush: 12,
      fever: 6,
    },
  },
};
