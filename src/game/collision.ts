import { distance, type Point } from "../vision/gesture";
import type { Flower } from "./types";

export function findCatchableFlower(params: {
  flowers: Flower[];
  palm: Point;
  hitboxScale: number;
}) {
  const { flowers, palm, hitboxScale } = params;
  let caughtIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  flowers.forEach((flower, index) => {
    const hitDistance = distance(palm, flower);
    const hitRadius = flower.radius * hitboxScale;

    if (hitDistance < hitRadius && hitDistance < nearestDistance) {
      caughtIndex = index;
      nearestDistance = hitDistance;
    }
  });

  return caughtIndex;
}
