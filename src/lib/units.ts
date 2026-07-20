// Unit normalization for nutrition math.
// Everything reduces to grams (mass) or milliliters (volume). When a conversion
// requires knowledge we do not have (e.g. cups -> grams without density), we
// return { grams: null, estimated: true } so callers can flag the result.

export type NutritionEstimate = {
  grams: number | null;
  ml: number | null;
  estimated: boolean;
  reason?: string;
};

// Base conversions to grams / ml.
const MASS_TO_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001, milligram: 0.001,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000,
  tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892,
  tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
  "fl oz": 29.5735, floz: 29.5735,
  cup: 236.588, cups: 236.588,
  pint: 473.176, pt: 473.176,
  quart: 946.353, qt: 946.353,
  gallon: 3785.41, gal: 3785.41,
};

const COUNT_UNITS = new Set(["piece", "pieces", "unit", "units", "each", "ct", "count", "serving", "servings"]);

export function normalizeUnit(u?: string | null): string {
  return (u ?? "").trim().toLowerCase();
}

export function toGrams(qty: number, unit: string | null | undefined, opts: { gramsPerServing?: number | null; densityGPerMl?: number | null } = {}): NutritionEstimate {
  const u = normalizeUnit(unit);
  if (!u) return { grams: null, ml: null, estimated: true, reason: "no unit" };

  if (u in MASS_TO_G) {
    const g = qty * MASS_TO_G[u];
    return { grams: g, ml: opts.densityGPerMl ? g / opts.densityGPerMl : null, estimated: false };
  }
  if (u in VOLUME_TO_ML) {
    const ml = qty * VOLUME_TO_ML[u];
    if (opts.densityGPerMl) return { grams: ml * opts.densityGPerMl, ml, estimated: false };
    // Assume water-like density as a rough estimate.
    return { grams: ml, ml, estimated: true, reason: "density unknown, assumed 1 g/ml" };
  }
  if (COUNT_UNITS.has(u)) {
    if (opts.gramsPerServing) return { grams: qty * opts.gramsPerServing, ml: null, estimated: false };
    return { grams: null, ml: null, estimated: true, reason: "count unit without serving weight" };
  }
  return { grams: null, ml: null, estimated: true, reason: `unknown unit "${u}"` };
}

export const UNIT_OPTIONS = [
  "g", "kg", "mg", "oz", "lb",
  "ml", "l", "tsp", "tbsp", "fl oz", "cup", "pint", "quart",
  "piece", "serving",
];
