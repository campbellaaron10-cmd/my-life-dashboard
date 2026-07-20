// Rules-based shelf-life estimator inspired by USDA FoodKeeper.
// Values in days from purchase/opened. Coarse but useful defaults; a printed
// expiration date on the pantry item should always override the estimate.
//
// Each rule keyed by a keyword matcher; first match wins. Duration table is
// indexed by storage location and whether the item has been opened.

export type ShelfLocation = "pantry" | "fridge" | "freezer" | "other";

type Rule = {
  match: RegExp;
  label: string;
  // days
  pantry?: { unopened: number; opened?: number };
  fridge?: { unopened: number; opened?: number };
  freezer?: { unopened: number; opened?: number };
};

// Coarse FoodKeeper-derived defaults. Not exhaustive.
const RULES: Rule[] = [
  { match: /\b(whole|2%|skim|1%|reduced fat)?\s*milk\b/i, label: "milk",
    fridge: { unopened: 7, opened: 5 }, freezer: { unopened: 90 } },
  { match: /\byogurt\b/i, label: "yogurt", fridge: { unopened: 14, opened: 7 }, freezer: { unopened: 60 } },
  { match: /\bcheese\b.*\b(hard|parmesan|cheddar|gouda)\b|\b(parmesan|cheddar|gouda)\b/i, label: "hard cheese",
    fridge: { unopened: 180, opened: 60 }, freezer: { unopened: 240 } },
  { match: /\bcheese\b/i, label: "cheese", fridge: { unopened: 60, opened: 14 }, freezer: { unopened: 180 } },
  { match: /\beggs?\b/i, label: "eggs", fridge: { unopened: 35, opened: 35 } },
  { match: /\bbutter\b/i, label: "butter", fridge: { unopened: 60, opened: 30 }, freezer: { unopened: 270 } },
  { match: /\b(chicken|turkey|poultry)\b.*\b(raw|breast|thigh|whole)?\b/i, label: "raw poultry",
    fridge: { unopened: 2 }, freezer: { unopened: 270 } },
  { match: /\b(ground beef|ground turkey|ground pork)\b/i, label: "ground meat",
    fridge: { unopened: 2 }, freezer: { unopened: 120 } },
  { match: /\b(beef|steak|pork|lamb)\b/i, label: "raw meat",
    fridge: { unopened: 4 }, freezer: { unopened: 270 } },
  { match: /\b(fish|salmon|tuna|cod|tilapia|shrimp)\b/i, label: "seafood",
    fridge: { unopened: 2 }, freezer: { unopened: 120 } },
  { match: /\b(deli|lunch\s?meat|ham|salami)\b/i, label: "deli meat",
    fridge: { unopened: 14, opened: 5 } },
  { match: /\b(banana|avocado)\b/i, label: "banana/avocado",
    pantry: { unopened: 5 }, fridge: { unopened: 7 } },
  { match: /\b(apple|pear)\b/i, label: "apple/pear",
    pantry: { unopened: 21 }, fridge: { unopened: 42 } },
  { match: /\b(berries|strawberr|blueberr|raspberr|blackberr)\b/i, label: "berries",
    fridge: { unopened: 5 }, freezer: { unopened: 240 } },
  { match: /\b(lettuce|spinach|kale|greens|arugula)\b/i, label: "leafy greens",
    fridge: { unopened: 7 } },
  { match: /\b(carrot|celery|broccoli|cauliflower)\b/i, label: "hardy veg",
    fridge: { unopened: 14 }, freezer: { unopened: 240 } },
  { match: /\b(onion|potato|garlic|shallot)\b/i, label: "roots",
    pantry: { unopened: 30 }, fridge: { unopened: 60 } },
  { match: /\b(tomato)\b/i, label: "tomato",
    pantry: { unopened: 5 }, fridge: { unopened: 10 } },
  { match: /\bbread\b/i, label: "bread",
    pantry: { unopened: 5, opened: 5 }, fridge: { unopened: 14 }, freezer: { unopened: 90 } },
  { match: /\b(pasta|rice|oats?|quinoa|flour|sugar)\b/i, label: "dry staple",
    pantry: { unopened: 730, opened: 365 } },
  { match: /\bcereal\b/i, label: "cereal",
    pantry: { unopened: 365, opened: 90 } },
  { match: /\b(canned|can of|tin of)\b/i, label: "canned",
    pantry: { unopened: 730, opened: 4 }, fridge: { unopened: 730, opened: 4 } },
  { match: /\b(juice|soda|beverage|drink)\b/i, label: "juice/soda",
    pantry: { unopened: 180, opened: 7 }, fridge: { unopened: 180, opened: 7 } },
  { match: /\b(sauce|ketchup|mustard|mayo|dressing)\b/i, label: "condiment",
    pantry: { unopened: 365, opened: 180 }, fridge: { unopened: 365, opened: 180 } },
  { match: /\b(oil|olive oil|vegetable oil)\b/i, label: "oil",
    pantry: { unopened: 730, opened: 365 } },
];

// Fallback if nothing matches — extremely conservative.
const FALLBACK: Rule = {
  match: /.*/, label: "generic",
  pantry: { unopened: 90, opened: 30 },
  fridge: { unopened: 14, opened: 7 },
  freezer: { unopened: 180 },
};

export type ShelfLifeEstimate = {
  days: number;
  useByDate: string; // YYYY-MM-DD
  label: string;     // matched food class
  opened: boolean;
  source: "foodkeeper-rules";
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function estimateShelfLife(input: {
  foodName: string;
  location: ShelfLocation;
  purchasedOn?: string | null;
  openedOn?: string | null;
}): ShelfLifeEstimate | null {
  const name = input.foodName || "";
  const rule = RULES.find((r) => r.match.test(name)) ?? FALLBACK;
  const loc = input.location === "other" ? "pantry" : input.location;
  const bucket = rule[loc];
  if (!bucket) return null;
  const opened = !!input.openedOn;
  const days = opened && bucket.opened != null ? bucket.opened : bucket.unopened;
  const start = (opened ? input.openedOn : input.purchasedOn) || new Date().toISOString().slice(0, 10);
  return {
    days,
    useByDate: addDays(start.slice(0, 10), days),
    label: rule.label,
    opened,
    source: "foodkeeper-rules",
  };
}
