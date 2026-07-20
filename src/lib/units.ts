// Unit normalization for nutrition math.
// Everything reduces to grams (mass) or milliliters (volume). Conversions that
// require unknown info (e.g. cups -> grams without density, or a count without
// a serving weight) return { estimated: true } so callers can flag results.

export type UnitKind = "mass" | "volume" | "count" | "unknown";

export type NutritionEstimate = {
  grams: number | null;
  ml: number | null;
  estimated: boolean;
  reason?: string;
};

// oz  = weight (28.3495 g).  fl oz = volume (29.5735 ml). Keep them distinct.
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
  "fl oz": 29.5735, floz: 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
  cup: 236.588, cups: 236.588,
  pint: 473.176, pt: 473.176,
  quart: 946.353, qt: 946.353,
  gallon: 3785.41, gal: 3785.41,
};

const COUNT_UNITS = new Set([
  "piece", "pieces", "unit", "units", "each", "ct", "count",
  "serving", "servings", "item", "items",
]);

export function normalizeUnit(u?: string | null): string {
  return (u ?? "").trim().toLowerCase();
}

export function unitKind(u?: string | null): UnitKind {
  const n = normalizeUnit(u);
  if (!n) return "unknown";
  if (n in MASS_TO_G) return "mass";
  if (n in VOLUME_TO_ML) return "volume";
  if (COUNT_UNITS.has(n)) return "count";
  return "unknown";
}

export function toGrams(
  qty: number,
  unit: string | null | undefined,
  opts: { gramsPerServing?: number | null; densityGPerMl?: number | null } = {},
): NutritionEstimate {
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

export function toMl(
  qty: number,
  unit: string | null | undefined,
  opts: { densityGPerMl?: number | null } = {},
): NutritionEstimate {
  const g = toGrams(qty, unit, opts);
  if (g.ml != null) return g;
  if (g.grams != null && opts.densityGPerMl) return { ...g, ml: g.grams / opts.densityGPerMl };
  if (g.grams != null) return { ...g, ml: g.grams, estimated: true, reason: g.reason ?? "density unknown, assumed 1 g/ml" };
  return g;
}

// Household measure as stored on foods.household_measures (jsonb).
// Example: { unit: "cup", amount: 1, gramWeight: 240, label: "1 cup" }
export type HouseholdMeasure = {
  unit: string;
  amount: number;
  gramWeight: number;
  label?: string;
  modifier?: string | null;
};

export function findMeasure(
  measures: HouseholdMeasure[] | null | undefined,
  unit: string | null | undefined,
): HouseholdMeasure | undefined {
  const u = normalizeUnit(unit);
  if (!u || !measures?.length) return undefined;
  return measures.find((m) =>
    normalizeUnit(m.unit) === u ||
    normalizeUnit(m.label) === u ||
    normalizeUnit(m.modifier) === u,
  );
}

export const MASS_UNITS = Object.keys(MASS_TO_G).filter((u) => ["g", "kg", "mg", "oz", "lb"].includes(u));
export const VOLUME_UNITS = ["ml", "l", "tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon"];
export const UNIT_OPTIONS = [
  ...MASS_UNITS,
  ...VOLUME_UNITS,
  "piece", "serving", "item",
];
