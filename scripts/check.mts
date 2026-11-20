// npm run check: "is this shop ready to sell?" Reads your keys from .env.local (or the
// environment), asks Venroys a few read-only questions, and lists what is still missing.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

if (existsSync(".env.local"))
  for (const [k, v] of Object.entries(parseEnv(readFileSync(".env.local", "utf8"))))
    process.env[k] ??= v;

const { runChecks } = await import("../lib/readiness.ts");
const checks = await runChecks();
const todo = checks.filter((c) => c.status === "todo").length;
// --json: for scripts and AI agents. ready is true when nothing checkable is missing.
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ready: todo === 0, checks }, null, 2));
  process.exit(todo ? 1 : 0);
}
const mark = { ok: "✓", todo: "✗", manual: "?" } as const;
console.log("\nIs this shop ready to sell?\n");
for (const c of checks) console.log(`${mark[c.status]} ${c.title}\n  ${c.detail}\n`);
console.log(
  todo
    ? `${todo} thing${todo === 1 ? "" : "s"} to fix (✗). Items marked ? can only be checked in Venroys.`
    : "Nothing missing that can be checked from here. Items marked ? can only be checked in Venroys.",
);
process.exitCode = todo ? 1 : 0;
