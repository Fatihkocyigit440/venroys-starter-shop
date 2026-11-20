import { notFound } from "next/navigation";
import { runChecks } from "@/lib/readiness";
import { getCatalog } from "@/lib/shop-catalog";
import { shop } from "@/shop.config";

export const metadata = { title: "setup", robots: { index: false, follow: false } };

const mark = { ok: "✓", todo: "✗", manual: "?" } as const;
const label = { ok: "done", todo: "to do", manual: "check in Venroys" } as const;

// Setup checklist for the shop owner. Shown on your computer, and online only while the
// shop still shows demo products; once real products are live it is hidden.
export default async function SetupPage() {
  const catalog = await getCatalog();
  if (process.env.NODE_ENV === "production" && catalog.mode === "live") notFound();
  const checks = await runChecks();
  const todo = checks.filter((c) => c.status === "todo").length;
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">{shop.name} / setup</span>
      <h1>{todo ? "almost there." : "ready to sell."}</h1>
      <p className="nt-lead">
        {todo
          ? `${todo} thing${todo === 1 ? "" : "s"} left before people can pay.`
          : "Everything that can be checked from here is done."}{" "}
        Items marked ? can only be checked in your Venroys dashboard.
      </p>
      <ul className="nt-setup">
        {checks.map((c) => (
          <li key={c.title} data-status={c.status}>
            <span className="nt-setup-mark" aria-label={label[c.status]}>
              {mark[c.status]}
            </span>
            <div>
              <h2>{c.title}</h2>
              <p>{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="nt-bag-note">
        This page only reads from Venroys. Reload it after each change. It disappears once
        your real products are live.
      </p>
    </main>
  );
}
