import { findCatchableFlower } from "./collision";
import {
  createFlower,
  getGamePhase,
  getMaxFlowersForPhase,
  getNextSpawnDelay,
} from "./flowerSpawner";
import { GAME_CONFIG } from "./gameConfig";
import {
  calculateCatchScore,
  getComboMultiplier,
  getFeverMultiplier,
  getResultTitle,
} from "./score";
import type {
  CatchAttempt,
  FloatingText,
  Flower,
  FlowerCounts,
  GamePhase,
  GameSnapshot,
  GameStatus,
} from "./types";
import { createEmptyFlowerCounts } from "./types";

export const PLAY_AREA = GAME_CONFIG.playArea;

export class FlowerGameEngine {
  private status: GameStatus = "idle";
  private flowers: Flower[] = [];
  private feedbacks: FloatingText[] = [];
  private score = 0;
  private combo = 0;
  private bestCombo = 0;
  private caught = 0;
  private missed = 0;
  private flowerCounts: FlowerCounts = createEmptyFlowerCounts();
  private nextFlowerId = 1;
  private nextFeedbackId = 1;
  private nextSpawnAt = 0;
  private startedAt = 0;
  private endsAt = 0;
  private grabBufferUntil = 0;
  private feverAnnounced = false;

  start(now: number, width: number, height: number) {
    this.status = "playing";
    this.flowers = [];
    this.feedbacks = [];
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.caught = 0;
    this.missed = 0;
    this.flowerCounts = createEmptyFlowerCounts();
    this.nextFlowerId = 1;
    this.nextFeedbackId = 1;
    this.startedAt = now;
    this.endsAt = now + GAME_CONFIG.durationMs;
    this.grabBufferUntil = 0;
    this.feverAnnounced = false;
    this.nextSpawnAt = now;
    this.spawnFlower(now, width, height, this.getPhase(now));
  }

  reset() {
    this.status = "idle";
    this.flowers = [];
    this.feedbacks = [];
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.caught = 0;
    this.missed = 0;
    this.flowerCounts = createEmptyFlowerCounts();
    this.nextFlowerId = 1;
    this.nextFeedbackId = 1;
    this.nextSpawnAt = 0;
    this.startedAt = 0;
    this.endsAt = 0;
    this.grabBufferUntil = 0;
    this.feverAnnounced = false;
  }

  update(now: number, width: number, height: number) {
    this.feedbacks = this.feedbacks.filter((feedback) => feedback.expiresAt > now);

    if (this.status !== "playing") {
      return;
    }

    if (now >= this.endsAt) {
      this.status = "finished";
      this.flowers = [];
      this.feedbacks.push(
        this.createFeedback({
          x: width / 2,
          y: height * 0.34,
          text: "FINISH!",
          color: "#ffd856",
          now,
          size: 40,
        }),
      );
      return;
    }

    const phase = this.getPhase(now);
    const isFever = phase === "fever";

    if (isFever && !this.feverAnnounced) {
      this.feverAnnounced = true;
      this.feedbacks.push(
        this.createFeedback({
          x: width / 2,
          y: height * 0.28,
          text: "COOLLOWER FEVER!",
          color: "#7cf6bd",
          now,
          size: 34,
        }),
      );
    }

    this.expireFlowers(now);

    const maxFlowers = getMaxFlowersForPhase(phase);
    if (now >= this.nextSpawnAt && this.flowers.length < maxFlowers) {
      this.spawnFlower(now, width, height, phase);
      this.nextSpawnAt = now + getNextSpawnDelay(phase);
    }
  }

  attemptCatch({ palm, isGrab, grabStarted, now, hitboxScale }: CatchAttempt) {
    if (this.status !== "playing") {
      return;
    }

    if (grabStarted) {
      this.grabBufferUntil = now + GAME_CONFIG.grabBufferMs;
    }

    if (!isGrab && now > this.grabBufferUntil) {
      return;
    }

    if (now > this.grabBufferUntil) {
      return;
    }

    const caughtIndex = findCatchableFlower({
      flowers: this.flowers,
      palm,
      hitboxScale,
    });

    if (caughtIndex === -1) {
      return;
    }

    const [flower] = this.flowers.splice(caughtIndex, 1);
    this.grabBufferUntil = 0;
    this.flowerCounts[flower.kind] += 1;

    if (flower.kind === "wilted") {
      this.score = Math.max(0, this.score + flower.points);
      this.combo = 0;
      this.feedbacks.push(
        this.createFeedback({
          x: flower.x,
          y: flower.y,
          text: "앗, 시든꽃!",
          color: "#b00020",
          now,
          size: 24,
        }),
      );
      return;
    }

    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.caught += 1;

    const earned = calculateCatchScore({
      basePoints: flower.points,
      combo: this.combo,
      isFever: this.getPhase(now) === "fever",
    });
    this.score += earned;

    this.feedbacks.push(
      this.createFeedback({
        x: flower.x,
        y: flower.y,
        text: `+${earned}`,
        color: flower.color,
        now,
        size: flower.kind === "coollower" ? 30 : 24,
      }),
    );

    if (this.combo >= 3) {
      this.feedbacks.push(
        this.createFeedback({
          x: flower.x,
          y: flower.y - 34,
          text: getComboLabel(this.combo),
          color: "#ffd856",
          now,
          size: 22,
        }),
      );
    }
  }

  snapshot(now: number): GameSnapshot {
    const phase = this.getPhase(now);
    const isFever = phase === "fever";

    return {
      status: this.status,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      multiplier: getComboMultiplier(this.combo),
      feverMultiplier: getFeverMultiplier(isFever),
      phase,
      isFever,
      title: getResultTitle(this.score),
      caught: this.caught,
      missed: this.missed,
      remainingMs: this.status === "playing" ? Math.max(0, this.endsAt - now) : 0,
      flowers: [...this.flowers],
      flowerCounts: { ...this.flowerCounts },
      feedbacks: [...this.feedbacks],
    };
  }

  private getPhase(now: number): GamePhase {
    if (this.status !== "playing") {
      return "opening";
    }

    return getGamePhase(now - this.startedAt, this.endsAt - now);
  }

  private expireFlowers(now: number) {
    const activeFlowers: Flower[] = [];

    for (const flower of this.flowers) {
      if (flower.expiresAt > now) {
        activeFlowers.push(flower);
        continue;
      }

      if (flower.kind !== "wilted") {
        this.missed += 1;
        this.combo = Math.max(this.combo - 1, 0);
      }
    }

    this.flowers = activeFlowers;
  }

  private spawnFlower(now: number, width: number, height: number, phase: GamePhase) {
    this.flowers.push(
      createFlower({
        id: this.nextFlowerId,
        now,
        width,
        height,
        phase,
      }),
    );
    this.nextFlowerId += 1;
  }

  private createFeedback(params: {
    x: number;
    y: number;
    text: string;
    color: string;
    now: number;
    size: number;
  }): FloatingText {
    const { x, y, text, color, now, size } = params;

    return {
      id: this.nextFeedbackId++,
      x,
      y,
      text,
      color,
      bornAt: now,
      expiresAt: now + GAME_CONFIG.feedbackTtlMs,
      size,
    };
  }
}

function getComboLabel(combo: number) {
  if (combo >= 12) {
    return `${combo} COMBO FEVER!`;
  }

  if (combo >= 8) {
    return `${combo} FLOWER RUSH`;
  }

  if (combo >= 5) {
    return `${combo} COOL`;
  }

  return `${combo} NICE`;
}
