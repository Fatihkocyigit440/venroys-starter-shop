// npm run setup: type your two Venroys keys into your own terminal. They are saved in
// .env.local (never committed) and never shown on screen, so an AI agent helping you
// never sees them. Then the readiness check runs.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline";

const FILE = ".env.local";
const current: Record<string, string> = existsSync(FILE)
  ? (parseEnv(readFileSync(FILE, "utf8")) as Record<string, string>)
  : {};

// Reads one line; on a terminal the typed characters are hidden.
function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
    let prompted = false;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (!hidden || !prompted) write(s);
      prompted = true;
    };
    rl.question(question, (answer) => {
      if (hidden && process.stdin.isTTY) process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function key(name: string, prefix: string, label: string) {
  const existing = current[name];
  const hint = existing ? ` (Enter keeps ${existing.slice(0, 12)}…)` : "";
  for (;;) {
    const value = (await ask(`${label}${hint}: `, true)) || existing || "";
    if (value.startsWith(prefix)) return value;
    console.log(`  That doesn't look right: it should start with ${prefix}. Copy it again from Venroys → Developers → API keys.`);
  }
}

console.log("\nConnect this shop to your Venroys store.");
console.log("Create the keys in Venroys → Developers → API keys. Test keys (vr_pk_test_, vr_sk_test_) use the practice store.\n");
const pk = await key("VENROYS_PUBLISHABLE_KEY", "vr_pk_", "Publishable key");
const sk = await key("VENROYS_SECRET_KEY", "vr_sk_", "Secret key");
const mode = (k: string) => (k.includes("_test_") ? "test" : "live");
if (mode(pk) !== mode(sk)) {
  console.log("\nOne key is a test key and the other a live key. Use two of the same kind, then run npm run setup again.");
  process.exit(1);
}
const siteDefault = current.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const site = (await ask(`Website address (Enter keeps ${siteDefault}): `, false)) || siteDefault;

const values: Record<string, string> = {
  ...current,
  VENROYS_PUBLISHABLE_KEY: pk,
  VENROYS_SECRET_KEY: sk,
  NEXT_PUBLIC_SITE_URL: site.replace(/\/$/, ""),
};
writeFileSync(
  FILE,
  "# Written by npm run setup. Never commit this file.\n" +
    Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") +
    "\n",
  { mode: 0o600 },
);
console.log(`\nSaved to ${FILE} (${mode(pk)} keys). Checking your store…`);

for (const [k, v] of Object.entries(values)) process.env[k] = v;
const { runChecks } = await import("../lib/readiness.ts");
const checks = await runChecks();
const mark = { ok: "✓", todo: "✗", manual: "?" } as const;
for (const c of checks) console.log(`${mark[c.status]} ${c.title}\n  ${c.detail}`);
console.log("\nNext: npm run dev, then open http://127.0.0.1:3000 and /setup.");
