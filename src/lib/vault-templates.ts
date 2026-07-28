// Built-in Vault templates. Each defines the structured fields for an entry.
// Templates control HOW information is captured. They do not control how it is organized —
// that job belongs to `area` (life-area sidebar).
import {
  Car,
  Home,
  FileText,
  Contact,
  Shield,
  StickyNote,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type VaultFieldType = "text" | "textarea" | "number" | "date" | "url" | "list";

export type VaultFieldDef = {
  key: string;
  label: string;
  type: VaultFieldType;
  placeholder?: string;
  hint?: string;
};

export type VaultArea =
  | "home" | "vehicles" | "travel" | "finance" | "outdoor" | "reference" | "unfiled";

export const VAULT_AREAS: { key: VaultArea; label: string; description: string }[] = [
  { key: "home",       label: "Home",       description: "Appliances, filters, paint codes, providers." },
  { key: "vehicles",   label: "Vehicles",   description: "Cars, campers, boats — one page each." },
  { key: "travel",     label: "Travel",     description: "Passports, loyalty, travel documents." },
  { key: "finance",    label: "Finance",    description: "Policies, accounts, tax records." },
  { key: "outdoor",    label: "Outdoor",    description: "Camping, hiking, gear loadouts." },
  { key: "reference",  label: "Reference",  description: "Contacts, guides, notes." },
  { key: "unfiled",    label: "Unfiled",    description: "Temporary inbox — pick an area to file it." },
];

export type VaultTemplate = {
  key: string;
  label: string;
  plural: string;
  icon: LucideIcon;
  accent: string;
  description: string;
  defaultArea: VaultArea;
  /** If true, the "Attach to an asset" picker is offered by default. */
  attachByDefault?: boolean;
  fields: VaultFieldDef[];
  titleHint?: string;
};

export const VAULT_TEMPLATES: VaultTemplate[] = [
  {
    key: "note",
    label: "Note",
    plural: "Notes",
    icon: StickyNote,
    accent: "text-slate-300",
    description: "Freeform reference. The safest first stop.",
    defaultArea: "reference",
    fields: [],
  },
  {
    key: "recipe_note", // legacy value; UI label is "Guide"
    label: "Guide",
    plural: "Guides",
    icon: Wrench,
    accent: "text-orange-300",
    description: "Procedures and repeatable routines — oil change, winterizing, deployment.",
    defaultArea: "reference",
    fields: [
      { key: "trigger", label: "When to use", type: "text" },
      { key: "steps", label: "Steps", type: "list" },
    ],
  },
  {
    key: "vehicle",
    label: "Vehicle",
    plural: "Vehicles",
    icon: Car,
    accent: "text-sky-300",
    description: "One page per vehicle. Attach warranties, docs, and service notes.",
    defaultArea: "vehicles",
    titleHint: "e.g. 2019 Toyota 4Runner",
    fields: [
      { key: "make", label: "Make", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "vin", label: "VIN", type: "text" },
      { key: "plate", label: "License plate", type: "text" },
      { key: "mileage", label: "Current mileage", type: "number" },
      { key: "insurance_carrier", label: "Insurance carrier", type: "text" },
      { key: "policy_number", label: "Policy number", type: "text" },
      { key: "registration_expires", label: "Registration expires", type: "date" },
      { key: "next_service_on", label: "Next service on", type: "date" },
      { key: "service_log", label: "Service log", type: "textarea", placeholder: "Date · mileage · what was done" },
    ],
  },
  {
    key: "home",
    label: "Home Asset",
    plural: "Home Assets",
    icon: Home,
    accent: "text-amber-300",
    description: "Appliances, HVAC, paint codes, filters. Warranty & manual attach here.",
    defaultArea: "home",
    titleHint: "e.g. LG Refrigerator · Kitchen",
    fields: [
      { key: "category", label: "Category", type: "text", placeholder: "Appliance / Utility / Room / Provider" },
      { key: "make", label: "Make / brand", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "serial", label: "Serial number", type: "text" },
      { key: "installed_on", label: "Installed on", type: "date" },
      { key: "warranty_expires", label: "Warranty expires", type: "date" },
      { key: "filter_size", label: "Filter / part size", type: "text" },
      { key: "provider", label: "Provider / vendor", type: "text" },
      { key: "provider_phone", label: "Provider phone", type: "text" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    plural: "Contacts",
    icon: Contact,
    accent: "text-rose-300",
    description: "People and vendors you actually use.",
    defaultArea: "reference",
    fields: [
      { key: "role", label: "Role", type: "text", placeholder: "Plumber, doctor, mechanic..." },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "address", label: "Address", type: "text" },
    ],
  },
  {
    key: "document",
    label: "Document",
    plural: "Documents",
    icon: FileText,
    accent: "text-violet-300",
    description: "Passports, registrations, policies. Attaches to an asset by default.",
    defaultArea: "reference",
    attachByDefault: true,
    titleHint: "e.g. Passport",
    fields: [
      { key: "kind", label: "Type", type: "text", placeholder: "Passport / License / SSN card" },
      { key: "number", label: "Number", type: "text" },
      { key: "issued_by", label: "Issued by", type: "text" },
      { key: "issued_on", label: "Issued on", type: "date" },
      { key: "expires_on", label: "Expires on", type: "date" },
      { key: "storage_location", label: "Physical location", type: "text" },
    ],
  },
  {
    key: "warranty",
    label: "Warranty",
    plural: "Warranties",
    icon: Shield,
    accent: "text-cyan-300",
    description: "Coverage window on a purchase. Attaches to an asset by default.",
    defaultArea: "home",
    attachByDefault: true,
    titleHint: "e.g. LG Refrigerator warranty",
    fields: [
      { key: "product", label: "Product", type: "text" },
      { key: "retailer", label: "Retailer", type: "text" },
      { key: "purchased_on", label: "Purchased on", type: "date" },
      { key: "expires_on", label: "Coverage ends", type: "date" },
      { key: "receipt_url", label: "Receipt / policy URL", type: "url" },
      { key: "claim_phone", label: "Claim phone", type: "text" },
    ],
  },
];

export const templateByKey = (k: string) =>
  VAULT_TEMPLATES.find((t) => t.key === k) ?? VAULT_TEMPLATES[0];

/** All date-typed fields on a template — used by the reminder editor. */
export function dateFieldsOf(template: VaultTemplate) {
  return template.fields.filter((f) => f.type === "date");
}
