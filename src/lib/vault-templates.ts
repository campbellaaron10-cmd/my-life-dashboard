// Built-in Vault templates. Each defines the structured fields for an entry.
import {
  Car,
  Tent,
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

export type VaultTemplate = {
  key: string;
  label: string;
  plural: string;
  icon: LucideIcon;
  accent: string; // tailwind color class fragment used for tinting
  description: string;
  fields: VaultFieldDef[];
  titleHint?: string;
};

export const VAULT_TEMPLATES: VaultTemplate[] = [
  {
    key: "vehicle",
    label: "Vehicle",
    plural: "Vehicles",
    icon: Car,
    accent: "text-sky-300",
    description: "Registration, VIN, service log, and maintenance intervals.",
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
    key: "camping",
    label: "Camping Kit",
    plural: "Camping",
    icon: Tent,
    accent: "text-emerald-300",
    description: "Loadouts, gear checklists, and campsite intel.",
    titleHint: "e.g. Weekend loadout · Cades Cove",
    fields: [
      { key: "location", label: "Location", type: "text" },
      { key: "season", label: "Season", type: "text", placeholder: "Spring / Summer / Fall / Winter" },
      { key: "shelter", label: "Shelter", type: "text" },
      { key: "sleep_system", label: "Sleep system", type: "text" },
      { key: "cook_system", label: "Cook system", type: "text" },
      { key: "checklist", label: "Checklist", type: "list", hint: "One item per line" },
      { key: "reservations_url", label: "Reservation link", type: "url" },
    ],
  },
  {
    key: "home",
    label: "Home",
    plural: "Home",
    icon: Home,
    accent: "text-amber-300",
    description: "Appliances, paint codes, filter sizes, and provider info.",
    titleHint: "e.g. HVAC · Main house",
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
    key: "document",
    label: "Document",
    plural: "Documents",
    icon: FileText,
    accent: "text-violet-300",
    description: "IDs, licenses, and reference numbers.",
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
    description: "Track coverage windows on purchases.",
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
  {
    key: "contact",
    label: "Contact",
    plural: "Contacts",
    icon: Contact,
    accent: "text-rose-300",
    description: "People and vendors you actually use.",
    fields: [
      { key: "role", label: "Role", type: "text", placeholder: "Plumber, doctor, mechanic..." },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "address", label: "Address", type: "text" },
    ],
  },
  {
    key: "recipe_note",
    label: "Playbook",
    plural: "Playbooks",
    icon: Wrench,
    accent: "text-orange-300",
    description: "How-to guides, procedures, and repeatable routines.",
    fields: [
      { key: "trigger", label: "When to use", type: "text" },
      { key: "steps", label: "Steps", type: "list" },
    ],
  },
  {
    key: "note",
    label: "Note",
    plural: "Notes",
    icon: StickyNote,
    accent: "text-slate-300",
    description: "Freeform reference notes.",
    fields: [],
  },
];

export const templateByKey = (k: string) =>
  VAULT_TEMPLATES.find((t) => t.key === k) ?? VAULT_TEMPLATES[VAULT_TEMPLATES.length - 1];
