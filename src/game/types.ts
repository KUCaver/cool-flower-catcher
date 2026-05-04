import type { Point } from "../vision/gesture";

export type FlowerKind = "basic" | "gold" | "speed";

export type Flower = {
  id: number;
  x: number;
  y: number;
  radius: number;
  points: number;
  kind: FlowerKind;
  bornAt: number;
  expiresAt: number;
};

export type GameStatus = "idle" | "playing" | "finished";

export type GameSnapshot = {
  status: GameStatus;
  score: number;
  combo: number;
  caught: number;
  missed: number;
  remainingMs: number;
  flowers: Flower[];
};

export type CatchAttempt = {
  palm: Point;
  grabStarted: boolean;
  now: number;
  hitboxScale: number;
};
