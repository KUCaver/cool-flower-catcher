export function getComboMultiplier(combo: number) {
  if (combo >= 8) {
    return 2;
  }

  if (combo >= 5) {
    return 1.5;
  }

  if (combo >= 3) {
    return 1.2;
  }

  return 1;
}

export function getFeverMultiplier(isFever: boolean) {
  return isFever ? 1.5 : 1;
}

export function calculateCatchScore(params: {
  basePoints: number;
  combo: number;
  isFever: boolean;
}) {
  const { basePoints, combo, isFever } = params;

  if (basePoints <= 0) {
    return basePoints;
  }

  return Math.round(basePoints * getComboMultiplier(combo) * getFeverMultiplier(isFever));
}

export function getResultTitle(score: number) {
  if (score >= 400) {
    return "쿨라워 레전드";
  }

  if (score >= 300) {
    return "플라워 마스터";
  }

  if (score >= 200) {
    return "쿨라워 정원사";
  }

  if (score >= 100) {
    return "꽃잎 수집가";
  }

  return "새싹 가드너";
}
