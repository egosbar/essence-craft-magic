// Distilling calculations

// ABV from original and final specific gravity (simple formula)
export function abvFromOgFg(og: number, fg: number): number {
  return (og - fg) * 131.25;
}

// Potential ABV from OG alone
export function potentialAbv(og: number): number {
  return (og - 1) * 131.25;
}

// Dilution: how much water to add to hit target ABV
// currentAbv * currentVolume = targetAbv * finalVolume
export function waterToDilute(currentAbv: number, currentVolume: number, targetAbv: number): number {
  if (targetAbv <= 0 || targetAbv >= currentAbv) return 0;
  const finalVolume = (currentAbv * currentVolume) / targetAbv;
  return finalVolume - currentVolume;
}

// Estimate distillate volume from wash: wash L * wash ABV / target ABV (rough)
export function estimateDistillate(washVolume: number, washAbv: number, distillateAbv: number): number {
  if (distillateAbv <= 0) return 0;
  return (washVolume * washAbv) / distillateAbv;
}

// Temperature correction for hydrometer (calibrated at 20 °C)
export function correctSG(readSG: number, tempC: number): number {
  // Simple correction: +/- 0.0003 per 3 °C off 20 °C
  const delta = (tempC - 20) * 0.0001;
  return readSG + delta;
}

// Suggest cut sizes based on wash volume & ABV (very rough guide, in mL)
export function suggestCuts(washVolume: number, washAbv: number) {
  const totalSpiritMl = washVolume * 1000 * (washAbv / 100) / 0.6; // approx at ~60% collection ABV
  return {
    foreshots: Math.round(totalSpiritMl * 0.03),
    heads: Math.round(totalSpiritMl * 0.1),
    hearts: Math.round(totalSpiritMl * 0.65),
    tails: Math.round(totalSpiritMl * 0.22),
  };
}
