import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchVault from "./tools/search-vault";
import getVaultEntry from "./tools/get-vault-entry";
import createVaultNote from "./tools/create-vault-note";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import completeTask from "./tools/complete-task";
import listTrips from "./tools/list-trips";
import listUpcomingReminders from "./tools/list-upcoming-reminders";
import listPantryItems from "./tools/list-pantry-items";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// Supabase value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "my-life-dashboard",
  title: "My Life Dashboard",
  version: "0.1.0",
  instructions:
    "Tools for Atlas, a personal life dashboard. The Knowledge Vault is long-term memory (home, vehicles, travel, finance, reference notes, guides, warranties, documents) — search it before answering questions about the user's belongings, dates or procedures. Tasks are the action engine. Trips holds travel plans and memories. Pantry holds current kitchen inventory. Reminders surface upcoming expirations and maintenance. Search before creating so each fact keeps one authoritative home.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchVault,
    getVaultEntry,
    createVaultNote,
    listTasks,
    createTask,
    completeTask,
    listTrips,
    listUpcomingReminders,
    listPantryItems,
  ],
});
