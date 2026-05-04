import type { Point } from "../vision/gesture";

export const FLOWER_KIND_KEYS = ["basic", "spark", "coollower", "pollution"] as const;

export type FlowerKind = (typeof FLOWER_KIND_KEYS)[number];

export type GamePhase = "opening" | "rush" | "fever";

export type FlowerCounts = Record<FlowerKind, number>;

export type Flower = {
  id: number;
  x: number;
  y: number;
  radius: number;
  points: number;
  kind: FlowerKind;
  label: string;
  color: string;
  accentColor: string;
  bornAt: number;
  expiresAt: number;
};

export type GameStatus = "idle" | "playing" | "finished";

export type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  bornAt: number;
  expiresAt: number;
  size: number;
};

export type GameSnapshot = {
  status: GameStatus;
  score: number;
  combo: number;
  bestCombo: number;
  multiplier: number;
  feverMultiplier: number;
  phase: GamePhase;
  isFever: boolean;
  title: string;
  caught: number;
  missed: number;
  remainingMs: number;
  flowers: Flower[];
  flowerCounts: FlowerCounts;
  feedbacks: FloatingText[];
};

export type CatchAttempt = {
  palm: Point;
  isGrab: boolean;
  grabStarted: boolean;
  now: number;
  hitboxScale: number;
};

export function createEmptyFlowerCounts(): FlowerCounts {
  return {
    basic: 0,
    spark: 0,
    coollower: 0,
    pollution: 0,
  };
}
