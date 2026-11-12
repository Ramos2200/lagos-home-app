# IleLagos — Lagos home marketplace prototype

A mobile-first prototype for finding homes to **rent or buy in Lagos, Nigeria**, with owner and agent dashboards.
Built with **Next.js 16 (App Router), TypeScript and Tailwind CSS v4**.

> All people, estates, listings and checks are **fictional demo data**. Real Lagos neighbourhood and landmark
> names are used only for realism. Nothing here is verified, and no property title has been legally verified.

## Run it locally

Requirements: **Node.js 20.9 or newer** (Node LTS recommended) and npm.

```bash
cd lagos-home-app
npm install
npm run dev
```

Then open **http://localhost:3000**.

To run the optimized production build instead:

```bash
npm run build
npm start
```

## What's included

| Screen | Route |
| --- | --- |
| Home / search (Rent or Buy, area/estate/landmark, type, budget, bedrooms, key amenities) | `/` |
| Search results with filters (mobile filter sheet, sort) | `/search?mode=rent` · `/search?mode=sale` |
| Property details: photos, full costs, move-in estimate, amenities, water/power/security/parking/road, availability and last-confirmed dates, asking price history, trust checks, contact & viewing requests | `/listings/[id]` |
| Sign-up / onboarding (seeker, owner, agent — pick one or more) | `/signup` |
| Demo sign-in (no passwords — pick a demo account) | `/signin` |
| Account: switch/add roles, saved homes, your requests, your checks | `/account` |
| Owner dashboard: create, edit, pause/resume, change status, confirm availability, inquiries | `/dashboard/owner` |
| Agent dashboard: managed listings, inquiries, profile & checks | `/dashboard/agent` |
| Create / edit listing | `/dashboard/listings/new?as=owner` · `/dashboard/listings/[id]/edit` |
| How checks & statuses work | `/trust` |

### Try it

1. Go to **Sign in** and pick **Adaeze Okafor (demo)** → owner dashboard. Pause a listing, mark one as
   rented, or edit a price — the change appears in the listing's **Asking price history**.
2. Pick **Tunde Bakare (demo)** → agent dashboard with inquiries and profile tabs.
3. Open any listing as a guest or seeker and **Request a viewing** — it shows up in the lister's dashboard.
4. Go to **Account** and **Add role** to make one person both an owner and an agent.

## Product rules implemented

- **Prices in ₦** with explicit rent frequency (annual / quarterly / monthly). Agency fee, legal fee, caution
  deposit, service charge and any other move-in costs are separate fields, plus an estimated move-in total.
  Budget filters compare rents as yearly equivalents.
- **Rental statuses:** Available, Under offer, Rented, Paused, Availability unconfirmed.
  **Sale statuses:** Available, Under offer, Sold, Paused, Availability unconfirmed.
- **Rented / sold / paused listings are removed from search results.**
- Listings marked available but **not reconfirmed in 30 days** automatically show as *Availability unconfirmed*.
- **Occupancy is separate from availability** (Vacant / Owner-occupied / Tenant in place) — e.g. an owner-occupied
  home can be for sale.
- **Five separate trust checks**, each with its own label and date: identity check, agent licensing, owner
  authorization, document review, availability confirmation. States are *Not started*, *Submitted · not yet
  reviewed*, *Self-declared by lister* and *Demo review only · not a real check* — never "verified".
- **Asking price history:** every price change is stored with a date and optional note, labelled as asking prices
  (not sale prices or rent paid).

## Usability features

- **Lagos-aware search:** "Lekki" covers Phase 1, Ikate, Chevron, Ajah and Sangotedo; "Island", "Mainland",
  "Ikeja" and nicknames like "VI" or "Lekki Phase One" work too; "Lekki, Yaba" searches both. Type-ahead
  suggests areas, estates and landmarks. Empty results suggest nearby areas or dropping filters.
- **Results:** compact list view (default on phones) or grid view; active filters shown as removable chips;
  move-in total and yearly equivalent of monthly rents on every card; *Save search* for signed-in users.
- **Listing page:** price and move-in total near the top and in the sticky bar; WhatsApp, Call and Share buttons
  (WhatsApp/Call are labelled placeholders); checks collapsed into a one-line summary; *Similar homes nearby*.
- **Onboarding:** home seekers pick areas, budget and bedrooms; the home page then shows matches and saved searches.
  Owner and agent dashboards show a dismissible *Getting started* checklist.
- **Dashboards:** one main action per listing plus a *More* menu; marking Rented/Sold asks for confirmation and every
  status change can be undone.
- **Listing form:** four steps (Basics → Price & costs → Details → Review), drafts saved in the browser, and naira
  amounts formatted as you type.

## Prototype limits

- Data is seeded from `src/lib/seed.ts` and **saved in your browser with localStorage**
  (key `lagos-homes-demo-v1`). Use **Reset demo data** in the footer to start over.
- No backend, paid services or external integrations. Photos are inline SVG illustrations; the map is a placeholder.
- **Not implemented (shown as labelled placeholders):** identity verification, agent registry lookups, land
  registry/title search, payments and escrow. No ID documents or sensitive personal data are collected.

## Project structure

```
src/
  app/                 routes (pages)
  components/          UI: cards, badges, forms, dashboards, trust panel
  lib/
    types.ts           data model
    seed.ts            fictional demo data
    store.tsx          React context + localStorage persistence
    listing-utils.ts   search, status and cost logic
    constants.ts       areas, property types, amenities, labels
    format.ts          ₦ formatting and dates
```
