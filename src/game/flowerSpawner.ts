import { FLOWER_TYPES, GAME_CONFIG } from "./gameConfig";
import type { Flower, FlowerKind, GamePhase } from "./types";

export function getGamePhase(elapsedMs: number, remainingMs: number): GamePhase {
  if (remainingMs <= GAME_CONFIG.feverDurationMs) {
    return "fever";
  }

  if (elapsedMs >= GAME_CONFIG.phaseStartsMs.rush) {
    return "rush";
  }

  return "opening";
}

export function getMaxFlowersForPhase(phase: GamePhase) {
  return GAME_CONFIG.maxFlowersByPhase[phase];
}

export function getNextSpawnDelay(phase: GamePhase) {
  const { min, max } = GAME_CONFIG.spawnDelayByPhase[phase];
  return randomBetween(min, max);
}

export function createFlower(params: {
  id: number;
  now: number;
  width: number;
  height: number;
  phase: GamePhase;
}): Flower {
  const { id, now, width, height, phase } = params;
  const config = FLOWER_TYPES[pickFlowerKind(phase)];
  const minX = width * GAME_CONFIG.playArea.xMin + config.radius;
  const maxX = width * GAME_CONFIG.playArea.xMax - config.radius;
  const minY = height * GAME_CONFIG.playArea.yMin + config.radius;
  const maxY = height * GAME_CONFIG.playArea.yMax - config.radius;

  return {
    id,
    kind: config.kind,
    label: config.label,
    points: config.points,
    radius: config.radius,
    color: config.color,
    accentColor: config.accentColor,
    x: randomBetween(minX, Math.max(minX, maxX)),
    y: randomBetween(minY, Math.max(minY, maxY)),
    bornAt: now,
    expiresAt: now + config.lifeMs,
  };
}

function pickFlowerKind(phase: GamePhase): FlowerKind {
  const weighted = Object.values(FLOWER_TYPES)
    .map((type) => ({
      kind: type.kind,
      weight: type.spawnWeights[phase],
    }))
    .filter((entry) => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.kind;
    }
  }

  return "basic";
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
