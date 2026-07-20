// USDA FoodData Central search/lookup as TanStack server functions.
// Uses DEMO_KEY by default (rate-limited). Set USDA_API_KEY secret for production limits.
import { createServerFn } from "@tanstack/react-start";

export type UsdaSearchHit = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
};

export type UsdaHouseholdMeasure = {
  unit: string;
  amount: number;
  gramWeight: number;
  label: string;
  modifier?: string | null;
};

export type UsdaFoodNormalized = {
  fdcId: number;
  name: string;
  brand?: string | null;
  dataType?: string | null;
  // Nutrition normalized per 100 g (USDA reports foodNutrients per 100 g).
  nutrient_basis: "per_100g" | "per_100ml";
  n_calories?: number | null;
  n_protein_g?: number | null;
  n_carbs_g?: number | null;
  n_fat_g?: number | null;
  n_fiber_g?: number | null;
  n_sugar_g?: number | null;
  n_sodium_mg?: number | null;
  // For display / editing.
  serving_size?: number | null;
  serving_unit?: string | null;
  grams_per_serving?: number | null;
  household_measures: UsdaHouseholdMeasure[];
};

const BASE = "https://api.nal.usda.gov/fdc/v1";

function apiKey() {
  return process.env.USDA_API_KEY || "DEMO_KEY";
}

// USDA nutrient keys — indexed by BOTH the numeric nutrient id (1008…) and
// the older nutrientNumber string ("208"…). Different endpoints/datasets
// return one or the other, so we accept both.
const NUTRIENT_IDS: Record<string, keyof UsdaFoodNormalized> = {
  "1008": "n_calories", "208": "n_calories",
  "1003": "n_protein_g", "203": "n_protein_g",
  "1005": "n_carbs_g",   "205": "n_carbs_g",
  "1004": "n_fat_g",     "204": "n_fat_g",
  "1079": "n_fiber_g",   "291": "n_fiber_g",
  "2000": "n_sugar_g",   "269": "n_sugar_g",
  "1093": "n_sodium_mg", "307": "n_sodium_mg",
};

export const searchUsdaFoods = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; pageSize?: number }) => data)
  .handler(async ({ data }) => {
    if (!data.query.trim()) return { hits: [] as UsdaSearchHit[] };
    const url = `${BASE}/foods/search?api_key=${apiKey()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: data.query,
        pageSize: data.pageSize ?? 20,
        dataType: ["Branded", "Foundation", "SR Legacy", "Survey (FNDDS)"],
      }),
    });
    if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
    const json = (await res.json()) as { foods?: any[] };
    const hits: UsdaSearchHit[] = (json.foods ?? []).map((f) => ({
      fdcId: f.fdcId,
      description: f.description,
      brandOwner: f.brandOwner,
      brandName: f.brandName,
      dataType: f.dataType,
      servingSize: f.servingSize,
      servingSizeUnit: f.servingSizeUnit,
    }));
    return { hits };
  });

// Detailed lookup — returns a fully normalized food ready to insert.
export const getUsdaFood = createServerFn({ method: "POST" })
  .inputValidator((data: { fdcId: number }) => data)
  .handler(async ({ data }): Promise<UsdaFoodNormalized> => {
    const url = `${BASE}/food/${data.fdcId}?api_key=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`USDA lookup failed: ${res.status}`);
    const f = (await res.json()) as any;

    // Determine basis: solids default to per_100g; liquid servings (ml/l/fl oz) → per_100ml.
    const rawUnit = (f.servingSizeUnit || "").toLowerCase();
    const servingUnitLower = rawUnit.replace("grm", "g").replace("mlt", "ml");
    const isVolume = ["ml", "l", "fl oz", "floz"].includes(servingUnitLower);
    const basis: "per_100g" | "per_100ml" = isVolume ? "per_100ml" : "per_100g";

    // 1. foodNutrients are per 100 g / 100 ml.
    const per100: Partial<UsdaFoodNormalized> = {};
    for (const n of f.foodNutrients ?? []) {
      const idKey = String(n.nutrient?.number ?? n.nutrientNumber ?? n.nutrient?.id ?? n.nutrientId ?? "");
      const key = NUTRIENT_IDS[idKey];
      if (!key) continue;
      const amount = typeof n.amount === "number" ? n.amount : typeof n.value === "number" ? n.value : null;
      if (amount != null) (per100 as any)[key] = Number(amount.toFixed(3));
    }

    // 2. Fallback: labelNutrients (per serving) scaled to per 100 g/ml.
    const hasAny = Object.keys(per100).length > 0;
    const label = f.labelNutrients;
    let servingBaseAmount: number | undefined; // grams OR ml per serving
    if (f.servingSize) {
      if (servingUnitLower === "g" || servingUnitLower === "ml") servingBaseAmount = f.servingSize;
      else if (servingUnitLower === "oz") servingBaseAmount = f.servingSize * 28.3495;
      else if (servingUnitLower === "fl oz" || servingUnitLower === "floz") servingBaseAmount = f.servingSize * 29.5735;
      else if (servingUnitLower === "l") servingBaseAmount = f.servingSize * 1000;
    }
    const gramsPerServing = isVolume ? undefined : servingBaseAmount;

    if (!hasAny && label && servingBaseAmount) {
      const scale = 100 / servingBaseAmount;
      const map: [keyof UsdaFoodNormalized, string][] = [
        ["n_calories", "calories"],
        ["n_protein_g", "protein"],
        ["n_carbs_g", "carbohydrates"],
        ["n_fat_g", "fat"],
        ["n_fiber_g", "fiber"],
        ["n_sugar_g", "sugars"],
        ["n_sodium_mg", "sodium"],
      ];
      for (const [dest, src] of map) {
        const v = label[src]?.value;
        if (typeof v === "number") (per100 as any)[dest] = Number((v * scale).toFixed(3));
      }
    }


    // 3. Household measures from foodPortions.
    const measures: UsdaHouseholdMeasure[] = [];
    for (const p of f.foodPortions ?? []) {
      const amount = Number(p.amount ?? 1);
      const gramWeight = Number(p.gramWeight);
      if (!gramWeight) continue;
      const measureName = (p.measureUnit?.name || "").toLowerCase();
      const modifier = (p.modifier || p.portionDescription || "").toLowerCase().trim() || null;
      // Prefer the concrete measure name ("cup", "tbsp"), else the modifier, else "unit".
      const unit =
        measureName && measureName !== "undetermined"
          ? measureName
          : modifier
          ? modifier.split(",")[0].split(" ")[0]
          : "unit";
      const label = `${amount} ${measureName && measureName !== "undetermined" ? measureName : modifier ?? "unit"}`.trim();
      measures.push({ unit, amount, gramWeight, label, modifier });
    }
    // Always include a "serving" measure when we can derive gram weight.
    if (gramsPerServing) {
      measures.unshift({ unit: "serving", amount: 1, gramWeight: gramsPerServing, label: "1 serving" });
    }

    return {
      fdcId: f.fdcId,
      name: f.description,
      brand: f.brandOwner || f.brandName || null,
      dataType: f.dataType || null,
      nutrient_basis: basis,
      n_calories: per100.n_calories ?? null,
      n_protein_g: per100.n_protein_g ?? null,
      n_carbs_g: per100.n_carbs_g ?? null,
      n_fat_g: per100.n_fat_g ?? null,
      n_fiber_g: per100.n_fiber_g ?? null,
      n_sugar_g: per100.n_sugar_g ?? null,
      n_sodium_mg: per100.n_sodium_mg ?? null,
      serving_size: f.servingSize ?? null,
      serving_unit: servingUnitLower || null,
      grams_per_serving: gramsPerServing ?? null,
      household_measures: measures,
    };
  });
