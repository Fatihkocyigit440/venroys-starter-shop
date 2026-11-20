# Store brief

Fill this in before an AI agent builds your shop. It takes about 15 minutes, and it is what lets the agent
build the whole shop in one go instead of asking you questions all day.

**How to use it**

1. Copy this file, or ask your agent: *"Give me the Venroys store brief."*
2. Fill in what you know. Lines marked **(required)** are needed. Leave anything else empty: the agent picks a
   sensible default and tells you which ones it picked.
3. Give it back to the agent: paste it into the chat, or save it as `store-brief.md` in your shop folder and say
   *"Build my shop from store-brief.md."*

**Never put API keys, passwords or bank details in this brief.** The agent will ask you to type keys into
your own terminal when it needs them.

---

## 1. Your shop

- **Shop name (required):**
- **What you sell, in one sentence (required):** <!-- e.g. "Hand-printed T-shirts with Amsterdam street art" -->
- **Who buys it:** <!-- e.g. "Young people in the Netherlands and Belgium" -->
- **Language of the website:** <!-- default: English -->
- **Currency:** <!-- default: your Venroys store's currency -->
- **Tagline (one short line on the home page):**

## 2. Your Venroys account

Tick what's true. The agent uses this to know where to start.

- [ ] I have a Venroys account **(required: sign up at venroys.com first)**
- [ ] My products are already in Venroys
- [ ] My delivery prices are already set in Venroys
- [ ] I finished Venroys Payments onboarding (identity and bank account)
- [ ] I have a **Test sandbox** in my store menu (if not: email info@venroys.com to get one)

## 3. Products

Skip this section if your products are already in Venroys and published.

- **How many products at launch:**
- **Where they come from:** <!-- "I have them in stock" / "print-on-demand (Printful, …)" / "made to order" -->
- **Product photos are in:** <!-- a folder path, a Dropbox/Google Drive link, or "I'll send them" -->

For each product (copy the block):

```text
Name:
Price:
Short description:
Variants (sizes / colors):        e.g. S, M, L, XL — black, white
Stock per variant:                 e.g. 10 each, or "print-on-demand"
Size chart:                        yes / no (if yes, the measurements)
Collection:                        e.g. "Summer drop"
```

## 4. Delivery

- **You ship from (city, country) (required unless print-on-demand only):**
- **Countries you deliver to (required):** <!-- e.g. "Netherlands, Belgium, Germany" or "EU" -->
- **Delivery price per country:** <!-- e.g. "€5 NL, €9 rest of EU" -->
- **Free delivery from:** <!-- e.g. "€75", or "never" -->
- **Orders leave within:** <!-- e.g. "2–4 working days" -->

## 5. Payment and checkout

- **Where customers pay:**
  - [ ] On the Venroys payment page (default, works right away)
  - [ ] On my own website (Venroys has to switch this on for you; the payment page stays as a backup)
- **Payment methods you want:** <!-- e.g. cards, iDEAL, Klarna. You switch them on yourself in
  Venroys → Settings → Venroys Payments → Payment methods. -->

## 6. Look and feel

- **Mood in three words:** <!-- e.g. "minimal, dark, premium" -->
- **Colors:** <!-- hex codes if you have them (#141414), or words ("black, off-white, one bright blue") -->
- **Start in dark or light mode:** <!-- default: dark -->
- **Logo file:** <!-- path or link, SVG or PNG; empty = the shop name in text -->
- **Font:** <!-- a name, or "something clean" -->
- **1–3 websites you like, and what you like about them:**

## 7. Pages and texts

Write the text yourself, or write *"Write it for me"* and the agent drafts it for you to approve.

- **Home page heading and intro:**
- **About us (2–3 short paragraphs):**
- **Contact email for customers (required):**
- **Company or seller name (required, EU law):**
- **Business address (required, EU law):**
- **Days a customer has to return something:** <!-- default: 14, the EU minimum -->
- **Who pays to send a return back:** <!-- "customer" (default) or "shop" -->
- **Extra pages:** <!-- e.g. FAQ, size guide, lookbook -->

## 8. Web address and hosting

- **Domain:** <!-- e.g. myshop.com, or "I don't have one yet" (you get a free myshop.vercel.app address) -->
- [ ] I have a GitHub account
- [ ] I have a Vercel account (free is fine)

## 9. When is it done?

Anything that must work before you call it finished. <!-- e.g. "Customers can log in and see their orders",
"Size guide on every T-shirt", "Launch on 1 December" -->

-

---

## What you will do yourself

The agent does the rest, and tells you when it needs each one:

- Approve the Venroys connection in your browser.
- Create two API keys in Venroys and type them into `npm run setup` in your own terminal.
- Finish Venroys Payments onboarding (identity and bank checks).
- Say yes or no to every change the agent wants to make in your Venroys store.
- Place and refund your first real order.
