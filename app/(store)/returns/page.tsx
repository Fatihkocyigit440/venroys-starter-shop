import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { shop } from "@/shop.config";
const days = shop.returns.days;
export const metadata = pageMetadata({
  title: "returns",
  description: `How to cancel an order, return it within ${days} days and get your money back from ${shop.name}.`,
  path: "/returns",
});
const mail = `mailto:${shop.contact}`;
const customerPays = shop.returns.returnShippingPaidBy === "customer";
// A plain EU-style cancellation and returns policy built from shop.config.ts (returns).
// Read it once and adjust it to your business; it is a starting point, not legal advice.
export default function ReturnsPage() {
  return (
    <main id="main" className="nt-prose">
      <span className="nt-label nt-muted">{shop.name}</span>
      <h1>returns</h1>
      <p className="nt-lead">
        {days} days to think it over after it arrives. No reason needed.
        {customerPays
          ? " Return shipping is at your own cost."
          : " Return shipping is on us."}
      </p>

      <h2>cancel before it ships</h2>
      <p>
        Email <a href={mail}>{shop.contact}</a> with your order email address and
        the date you ordered. If it hasn’t shipped yet, we cancel the order and
        refund everything, including shipping.
      </p>

      <h2>return within {days} days</h2>
      <ol className="nt-prose-steps">
        <li>
          Tell us within {days} days of receiving your order: email{" "}
          <a href={mail}>{shop.contact}</a> or send the form below.
        </li>
        <li>We reply with the return address.</li>
        <li>
          Send it back within {days} days of telling us, unused, with its labels.
          {customerPays
            ? " You arrange and pay for the return shipping. Keep your proof of postage."
            : " We send you a prepaid label."}
        </li>
      </ol>

      <h2>your refund</h2>
      <p>
        We refund the price and the standard shipping you paid within 14 days of
        hearing from you, to the payment method you used. We may wait until the
        item is back with us, or until you show it’s on its way. If it comes back
        used or damaged, we may deduct the loss in value.
      </p>

      <h2>faulty or wrong</h2>
      <p>
        If something arrives damaged or isn’t what you ordered, email us a photo
        and we’ll replace it or refund you, including all shipping. This doesn’t
        limit your legal rights.
      </p>

      <h2>withdrawal form</h2>
      <p>
        Only if you want to use it. Copy it into an email to{" "}
        <a href={mail}>{shop.contact}</a>:
      </p>
      <blockquote className="nt-prose-form">
        <p>
          To {shop.legalName}, {shop.address}, {shop.contact}:
        </p>
        <p>
          I hereby give notice that I withdraw from my contract of sale of the
          following goods: [product and size]
        </p>
        <p>Ordered on [date] / received on [date]</p>
        <p>Name: [your name]</p>
        <p>Address: [your address]</p>
        <p>Date: [today]</p>
      </blockquote>

      <div className="nt-prose-links">
        <Link href="/shipping">shipping ↗</Link>
        <Link href="/shop">back to the shop ↗</Link>
      </div>
    </main>
  );
}
