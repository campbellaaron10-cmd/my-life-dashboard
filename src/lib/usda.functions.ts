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

export type UsdaFoodDetail = {
  fdcId: number;
  description: string;
  brand?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  gramsPerServing?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};

const BASE = "https://api.nal.usda.gov/fdc/v1";

function apiKey() {
  return process.env.USDA_API_KEY || "DEMO_KEY";
}

// USDA reports nutrients per 100 g by default; when a labelNutrients block
// exists, it is per serving.
const NUTRIENT_IDS: Record<string, keyof UsdaFoodDetail> = {
  "1008": "calories",   // Energy (kcal)
  "1003": "protein_g",
  "1005": "carbs_g",
  "1004": "fat_g",
  "1079": "fiber_g",
  "2000": "sugar_g",
  "1093": "sodium_mg",
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
        pageSize: data.pageSize ?? 15,
        dataType: ["Branded", "Foundation", "SR Legacy", "Survey (FNDDS)"],
      }),
    });
    if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
    const json = await res.json() as { foods?: any[] };
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

export const getUsdaFood = createServerFn({ method: "POST" })
  .inputValidator((data: { fdcId: number }) => data)
  .handler(async ({ data }) => {
    const url = `${BASE}/food/${data.fdcId}?api_key=${apiKey()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`USDA lookup failed: ${res.status}`);
    const f = await res.json() as any;

    const detail: UsdaFoodDetail = {
      fdcId: f.fdcId,
      description: f.description,
      brand: f.brandOwner || f.brandName,
      servingSize: f.servingSize,
      servingSizeUnit: f.servingSizeUnit,
    };

    // Prefer labelNutrients (per serving on the actual label) when present.
    const label = f.labelNutrients;
    if (label) {
      detail.calories = label.calories?.value;
      detail.protein_g = label.protein?.value;
      detail.carbs_g = label.carbohydrates?.value;
      detail.fat_g = label.fat?.value;
      detail.fiber_g = label.fiber?.value;
      detail.sugar_g = label.sugars?.value;
      detail.sodium_mg = label.sodium?.value;
      if (f.servingSize && (f.servingSizeUnit === "g" || f.servingSizeUnit === "GRM")) {
        detail.gramsPerServing = f.servingSize;
      }
      return detail;
    }

    // Otherwise convert per-100g foodNutrients to per-serving when we know grams.
    const nutrients: Record<string, number> = {};
    for (const n of f.foodNutrients ?? []) {
      const id = String(n.nutrient?.number ?? n.nutrientNumber ?? "");
      const key = NUTRIENT_IDS[id];
      if (key && typeof n.amount === "number") nutrients[key] = n.amount; // per 100 g
    }
    const per100 = 100;
    const grams = (f.servingSize && (f.servingSizeUnit === "g" || f.servingSizeUnit === "GRM")) ? f.servingSize : undefined;
    const scale = grams ? grams / per100 : 1;
    if (grams) detail.gramsPerServing = grams;
    for (const [k, v] of Object.entries(nutrients)) {
      (detail as any)[k] = Number((v * scale).toFixed(2));
    }
    return detail;
  });
