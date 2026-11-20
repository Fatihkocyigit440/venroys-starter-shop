// npm run check: "is this shop ready to sell?" Reads your keys from .env.local (or the
// environment), asks Venroys a few read-only questions, and lists what is still missing.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

if (existsSync(".env.local"))
  for (const [k, v] of Object.entries(parseEnv(readFileSync(".env.local", "utf8"))))
    process.env[k] ??= v;

const { runChecks } = await import("../lib/readiness.ts");
const checks = await runChecks();
const mark = { ok: "✓", todo: "✗", manual: "?" } as const;
console.log("\nIs this shop ready to sell?\n");
for (const c of checks) console.log(`${mark[c.status]} ${c.title}\n  ${c.detail}\n`);
const todo = checks.filter((c) => c.status === "todo").length;
console.log(
  todo
    ? `${todo} thing${todo === 1 ? "" : "s"} to fix (✗). Items marked ? can only be checked in Venroys.`
    : "Nothing missing that can be checked from here. Items marked ? can only be checked in Venroys.",
);
process.exitCode = todo ? 1 : 0;
