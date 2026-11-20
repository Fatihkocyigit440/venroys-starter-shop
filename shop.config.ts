// Everything that makes this shop yours lives in this file.
// Change the values below; the rest of the code reads them. Your Venroys keys do NOT
// go here: put them in your hosting settings (see README.md, "Add your keys").

export const shop = {
  // Your shop's name, shown in the header, footer, browser tab and search results.
  name: "Starter Shop",
  // One short line under the name on the home page.
  tagline: "Good things, sold simply.",
  // One or two sentences for search engines and link previews.
  description:
    "An independent shop. Browse the collection and pay securely with Venroys.",
  // Your website address, without a slash at the end. Set NEXT_PUBLIC_SITE_URL in your
  // hosting settings, or replace the fallback here.
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // The email address customers can write to.
  contact: "hello@example.com",
  // Who is selling. EU law asks you to name the seller on the returns page.
  legalName: "Your Company",
  address: "Street 1, 1000 AA City, Country",
  // A short place line for the footer.
  location: "city / country",

  // How numbers and dates are written. Live prices always use your Venroys store's currency.
  locale: "en-GB",
  currency: "EUR",
  timeZone: "Europe/Amsterdam",

  home: {
    eyebrow: "new collection",
    heading: "Good things, sold simply.",
    intro: "A small collection, made with care. Pick something you like and pay in a minute.",
    button: "shop all",
  },

  about: {
    heading: "About us",
    paragraphs: [
      "Tell your customers who you are, what you make and why. Two or three short paragraphs are enough.",
      "Edit this text in shop.config.ts.",
    ],
  },

  shipping: {
    // What customers should know before they order. Prices come from Venroys at checkout.
    lines: [
      "We ship from our studio. Orders usually leave within 2–4 working days.",
      "You see the delivery price for your address at checkout, before you pay.",
      "Venroys emails you a confirmation and, once it ships, the tracking details.",
    ],
  },

  returns: {
    // Days a customer has to cancel and send something back. The EU minimum is 14.
    days: 14,
    // Who pays to send a return back: "customer" or "shop".
    returnShippingPaidBy: "customer" as "customer" | "shop",
  },

  // Colors. "dark" is shown first; visitors can switch to "light".
  theme: {
    dark: {
      background: "#141414",
      surface: "#2b2b2b",
      text: "#e8e4dc",
      muted: "#8a8a87",
    },
    light: {
      background: "#f2efe9",
      surface: "#e1ddd5",
      text: "#141414",
      muted: "#595956",
    },
    // Buttons and highlights, plus the text color on top of them.
    accent: "#2f5bd3",
    onAccent: "#ffffff",
  },

  // Venroys gives one photo per product to the storefront. To show more photos on a product
  // page, put them in public/products/ and list them here by the product's Venroys slug:
  //   "my-shirt-123": ["/products/my-shirt-back.jpg", "/products/my-shirt-detail.jpg"],
  extraPhotos: {} as Record<string, string[]>,
};
