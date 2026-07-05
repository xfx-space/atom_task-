// Atom Harness — agent bootstrap hook
// Injects SAFETY.md into every agent session
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default async function handler(event) {
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  const safetyPath = join(
    event.context.workspaceDir || process.cwd(),
    "hooks",
    "atom-harness",
    "scripts",
    "SAFETY.md"
  );

  if (!existsSync(safetyPath)) {
    console.warn("[atom-harness] SAFETY.md not found, skipping");
    return;
  }

  const safetyContent = readFileSync(safetyPath, "utf-8");

  // Inject SAFETY.md into bootstrap files
  // It will be loaded alongside AGENTS.md, SOUL.md, etc.
  if (!event.context.bootstrapFiles) {
    event.context.bootstrapFiles = [];
  }
  event.context.bootstrapFiles.push({
    name: "SAFETY.md",
    content: safetyContent,
  });
}
