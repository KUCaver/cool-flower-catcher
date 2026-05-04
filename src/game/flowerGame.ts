import { distance, type Point } from "../vision/gesture";
import type { CatchAttempt, Flower, FlowerKind, GameSnapshot, GameStatus } from "./types";

const GAME_DURATION_MS = 30_000;
const FLOWER_TTL_MS = 2_600;
const MAX_FLOWERS = 7;
const CATCH_PADDING = 34;

const FLOWER_KINDS: Record<FlowerKind, { points: number; radius: number }> = {
  basic: { points: 10, radius: 42 },
  gold: { points: 30, radius: 34 },
  speed: { points: 18, radius: 30 },
};

export class FlowerGameEngine {
  private status: GameStatus = "idle";
  private flowers: Flower[] = [];
  private score = 0;
  private combo = 0;
  private caught = 0;
  private missed = 0;
  private nextFlowerId = 1;
  private nextSpawnAt = 0;
  private endsAt = 0;

  start(now: number, width: number, height: number) {
    this.status = "playing";
    this.flowers = [];
    this.score = 0;
    this.combo = 0;
    this.caught = 0;
    this.missed = 0;
    this.nextFlowerId = 1;
    this.endsAt = now + GAME_DURATION_MS;
    this.nextSpawnAt = now;
    this.spawnFlower(now, width, height);
  }

  reset() {
    this.status = "idle";
    this.flowers = [];
    this.score = 0;
    this.combo = 0;
    this.caught = 0;
    this.missed = 0;
    this.nextFlowerId = 1;
    this.nextSpawnAt = 0;
    this.endsAt = 0;
  }

  update(now: number, width: number, height: number) {
    if (this.status !== "playing") {
      return;
    }

    if (now >= this.endsAt) {
      this.status = "finished";
      this.flowers = [];
      return;
    }

    const activeFlowers: Flower[] = [];
    for (const flower of this.flowers) {
      if (flower.expiresAt <= now) {
        this.missed += 1;
        this.combo = 0;
      } else {
        activeFlowers.push(flower);
      }
    }
    this.flowers = activeFlowers;

    if (now >= this.nextSpawnAt && this.flowers.length < MAX_FLOWERS) {
      this.spawnFlower(now, width, height);
      const speedUp = Math.min(this.caught * 18, 420);
      this.nextSpawnAt = now + 920 - speedUp + Math.random() * 280;
    }
  }

  attemptCatch({ palm, grabStarted }: CatchAttempt) {
    if (this.status !== "playing" || !grabStarted) {
      return;
    }

    let caughtIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.flowers.forEach((flower, index) => {
      const hitDistance = distance(palm, flower);
      const hitRadius = flower.radius + CATCH_PADDING;

      if (hitDistance < hitRadius && hitDistance < nearestDistance) {
        caughtIndex = index;
        nearestDistance = hitDistance;
      }
    });

    if (caughtIndex === -1) {
      this.combo = 0;
      return;
    }

    const [flower] = this.flowers.splice(caughtIndex, 1);
    this.caught += 1;
    this.combo += 1;

    const multiplier = this.combo >= 8 ? 2 : this.combo >= 5 ? 1.5 : this.combo >= 3 ? 1.2 : 1;
    this.score += Math.round(flower.points * multiplier);
  }

  snapshot(now: number): GameSnapshot {
    return {
      status: this.status,
      score: this.score,
      combo: this.combo,
      caught: this.caught,
      missed: this.missed,
      remainingMs: this.status === "playing" ? Math.max(0, this.endsAt - now) : 0,
      flowers: [...this.flowers],
    };
  }

  private spawnFlower(now: number, width: number, height: number) {
    const kind = pickFlowerKind();
    const config = FLOWER_KINDS[kind];
    const safeX = Math.max(width - config.radius * 2, 1);
    const safeY = Math.max(height - config.radius * 2, 1);

    this.flowers.push({
      id: this.nextFlowerId,
      kind,
      points: config.points,
      radius: config.radius,
      x: config.radius + Math.random() * safeX,
      y: config.radius + Math.random() * safeY,
      bornAt: now,
      expiresAt: now + FLOWER_TTL_MS,
    });

    this.nextFlowerId += 1;
  }
}

function pickFlowerKind(): FlowerKind {
  const roll = Math.random();

  if (roll > 0.9) {
    return "gold";
  }

  if (roll > 0.68) {
    return "speed";
  }

  return "basic";
}
