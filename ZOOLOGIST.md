# Zoologist: Design & Architecture

> **Zoologist** is a single-page website that shows one specific, interesting animal each day: a photo, fun facts, and the essentials (habitat, size, range, diet, conservation status).

---

## 1. Goals & Non-Goals

### Goals
- **One animal per day.** Everyone visiting on the same date sees the same animal.
- **Specific species.** Show something like the "Aye-aye" or "Pink fairy armadillo," not "Lemur" or "Armadillo."
- **Everything on one page.** No navigation and no accounts.
- **Fast and free to host.** The site is static, needs no backend server to maintain, and costs close to $0/month.
- **Reliable content.** Facts come from structured sources and are reviewed, and photos are correctly licensed and attributed.

### Non-Goals (v1)
- User accounts, favorites, or streaks *(possible v2)*
- Search or browsing the full catalog
- User-submitted content
- A native mobile app (the site should be responsive and installable as a PWA later)

---

## 2. User Experience

### The page, top to bottom

```
┌──────────────────────────────────────────┐
│  🐾 Zoologist              Oct 28, 2026  │
├──────────────────────────────────────────┤
│                                          │
│          [  HERO PHOTO  ]                │
│   Photo: Jane Doe · CC BY 4.0            │
│                                          │
│  Aye-aye                                 │
│  Daubentonia madagascariensis            │
│  Mammal · Primate · 🟠 Endangered        │
│                                          │
│  ── Quick Stats ──────────────────────   │
│  ⚖️ Weight   2.5 kg      📏 Length 40 cm  │
│  ⏳ Lifespan ~20 yrs     🍽️ Diet Omnivore  │
│  🌙 Activity Nocturnal                    │
│                                          │
│  ── Fun Facts ────────────────────────   │
│  • Taps on wood and listens for grubs…   │
│  • Its middle finger is thin and…        │
│  • …                                     │
│                                          │
│  ── Where It Lives ───────────────────   │
│  [ Range map ]                           │
│  Region: Eastern Madagascar              │
│  Habitat: Tropical rainforest            │
│  Ecosystem role: Insectivore / seed…     │
│                                          │
│  ── About ────────────────────────────   │
│  2–3 paragraph summary                   │
│                                          │
│  ── Sources & Credits ────────────────   │
│  Wikipedia · Wikidata · iNaturalist      │
│                                          │
│  Next animal in 14h 22m                  │
└──────────────────────────────────────────┘
```

### Design principles
| Principle | What it means in practice |
|---|---|
| **Photo first** | Show a large hero image above the fold, because the photo is the hook. |
| **Scannable** | Put quick stats in a grid of cards so the reader gets the key details in about 5 seconds. |
| **Delight** | Fun facts appear before the dense "About" text. |
| **Honest** | Mark unknown values as "Unknown" rather than leaving them blank, and give every claim a source. |
| **Calm** | Use a single column, generous whitespace, and no ads or pop-ups. |

### Visual style
- **Palette:** the **entire page is derived from one accent color that changes every day to match the animal** (see 2.1). There are no fixed brand colors: background, text, borders, and cards are all tints and shades of the day's accent. Supports dark mode.
- **Typography:** a rounded, friendly display font for headings and the logo (*Fredoka*), a rounded sans-serif for body text (*Nunito*), and italics for scientific names, following scientific convention.
- **Conservation badge:** use the IUCN color scheme (LC green → CR red) so endangered animals stand out.
- **Responsive:** design for 375px phones first. Max content width is about 720px on desktop.
- **Accessibility:** provide alt text for every image, meet WCAG AA contrast, use semantic HTML (`<main>`, `<section>`, `<h2>`), and don't rely on emoji alone (pair each with a text label).

### 2.1 Per-animal accent color
Each day's page takes on a signature color from that day's animal: amber for the aye-aye's eyes, electric blue for the blue sea dragon, slate gray for the shoebill, pink for the pink fairy armadillo. **Every color on the page comes from that one accent.** Nothing is a fixed green, gray, or brand color.

**Token scale (all derived from `--accent`)**
| Token | Recipe | Used for |
|---|---|---|
| `--accent` | the picked color | Header strip, logo icon, fun-fact badges, share button |
| `--accent-wash` | mixed 95% toward white | Page and header background |
| `--accent-soft` | mixed 86% toward white | Fun-fact cards, chips, range map backdrop |
| `--accent-line` | mixed 72% toward white | Borders and dividers |
| `--accent-ink` | mixed 80% toward black | Body text and headings |
| `--accent-muted` | mixed 50% toward black | Labels, captions, secondary text |
| `--accent-deep` | mixed 55% toward black | Hero photo backdrop, countdown bar |
| `--accent-on-deep` | mixed 88% toward white | Text on deep surfaces |

Stat cards stay plain white so the numbers read cleanly. The only exception to the accent rule is the conservation badge, which keeps its fixed IUCN colors so the status always means the same thing.

**How the color is chosen (build time)**
1. **Manual override first:** an optional `accent` entry in `overrides.json` (see 7.4) lets you hand-pick a color for animals with an iconic one, like the pink fairy armadillo.
2. **Otherwise, extract it from the photo:** run `node-vibrant` (or `sharp` stats) on the hero image and take the *Vibrant* swatch, falling back to *Muted*.
3. **Make it readable:** adjust lightness until white text on `--accent` passes WCAG AA (≥ 4.5:1) and `--accent-deep` stays dark enough for light text. Reject near-grays and very low saturation, and fall back to a per-class default (mammal = amber, bird = sky blue, reptile = olive, fish = teal, amphibian = lime, invertebrate = violet).
4. **Derive the other tokens:** compute the full token scale in the pipeline, check every text/background pair (ink on wash, muted on wash, on-deep on deep, white on accent) for AA contrast, and store the scale in the animal's JSON.
5. **Dark mode:** store a lighter `--accent` variant for dark backgrounds, checked against the dark surface.

**At runtime** the page sets the tokens as CSS custom properties on `<html>` before first paint, so there's no flash of the wrong color:
```js
const root = document.documentElement.style;
for (const [name, value] of Object.entries(animal.theme.tokens)) {
  root.setProperty(`--accent-${name}`, value); // e.g. --accent-wash
}
root.setProperty('--accent', animal.theme.accent);
```
Also update `<meta name="theme-color">` to the accent, so mobile browser chrome matches.

---

## 3. Key Decision: How does "new animal every day" work?

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Live API calls in the browser** | The page picks a random species and calls Wikipedia/iNaturalist on load. | No build step | Slow, depends on rate limits, can't review content, quality varies a lot |
| **B. Backend + database + cron** | A server picks the animal daily and stores it in a DB. | Flexible | Overkill, costs money, requires maintaining a server |
| **C. Pre-built static dataset + deterministic date pick** ✅ | A build script fetches and stores all animal data as JSON ahead of time. The page computes "today's animal" from the date. | Free, instant, reviewable, works offline, no server | New animals need a scheduled job and a redeploy (automated via GitHub Actions) |

**Decision: Option C.** All the hard work (fetching, cleaning, fact-writing) happens once at build time. The live site is plain HTML/JS/JSON.

### Deterministic daily selection
Every visitor computes the same animal for the same date with no server involved:

```ts
// Days since a fixed launch date, in the visitor's local date
const LAUNCH = Date.UTC(2026, 10, 1); // Nov 1, 2026
function dayIndex(d = new Date()) {
  const localMidnight = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((localMidnight - LAUNCH) / 86_400_000);
}

// schedule.json maps day index → animal id, filled ~14 days ahead
// by the discovery job. No repeats, because the pool is effectively unlimited.
const animalId = schedule.order[dayIndex()];
```

- **Pick ahead of time, not at runtime.** A scheduled job discovers new animals from online sources and appends them to `schedule.json` about two weeks ahead (see 7.3). The schedule is append-only, so past days never change.
- **Use the local date.** The animal changes at the visitor's midnight, which feels natural. *(Alternative: change at UTC midnight so the whole world sees the same animal at once. Pick one and document it.)*
- **Plan for variety.** The shuffle avoids putting two animals of the same class (two birds, two beetles) back-to-back.
- **Lifetime:** unlimited. Animals come from open databases rather than a fixed list, so the site can run for years without repeating.

---

## 4. Architecture

```
          BUILD TIME (runs locally or in GitHub Actions)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  discover  ──►  fetch script  ──►  enrich & validate        │
│  (iNat/Wikidata/   │                  │                     │
│   GBIF + score)    ├─ Wikidata        ├─ normalize units    │
│                     ├─ Wikipedia       ├─ check licenses    │
│                     ├─ iNaturalist     ├─ fun facts         │
│                     └─ GBIF            └─ human review flag │
│                                              │              │
│                                              ▼              │
│                           /public/data/animals/{id}.json    │
│                           /public/data/schedule.json        │
│                           /public/img/{id}.webp (optimized) │
└──────────────────────────────────────┬──────────────────────┘
                                       │ deploy
                                       ▼
          RUNTIME (static files on Vercel, no server or API calls)
┌─────────────────────────────────────────────────────────────┐
│  Browser loads index.html                                   │
│     → computes dayIndex                                     │
│     → fetches schedule.json → animals/{id}.json             │
│     → renders the page                                      │
└─────────────────────────────────────────────────────────────┘
```

### Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | **Astro**, `output: 'static'` | Builds to plain HTML/CSS/JS in `dist/`, ships near-zero JS |
| Styling | Plain CSS with custom properties | Makes the accent-color theming a few CSS variables |
| Fonts | Fredoka + Nunito, self-hosted via `@fontsource` | No runtime dependency on Google Fonts |
| Map | Static range-map image from the GBIF maps API, saved at build time | No map library or tile server at runtime |
| Data pipeline | **Node 20 + TypeScript** (`tsx`) | One language for the whole repo |
| Image optimization | `sharp` → WebP at 600 and 1200px | Keeps the hero image fast on mobile |
| Color extraction | `node-vibrant` | Pulls the accent from the photo |
| Hosting | **Vercel** (Hobby plan), static output | Free; the Vercel GitHub integration auto-deploys every push, so no Vercel token is needed |
| CI | **GitHub Actions** | Weekly discovery job commits new animals; that push triggers the Vercel deploy |

**It's 100% static.** At runtime there is no server, no database, and no API call: the browser only loads files from `dist/`. All API calls happen in the pipeline, at build time.

---

## 5. Data Sources

| Source | Provides | Notes |
|---|---|---|
| **Wikidata** (SPARQL / REST) | Scientific name, taxonomy, **mass (P2067)**, **length (P2043)**, **lifespan (P2250)**, **IUCN status (P141)**, image (P18) | Structured data with good coverage for well-known species and patchier coverage for obscure ones |
| **Wikipedia REST API** (`/page/summary`) | Readable summary paragraph and thumbnail | Text is CC BY-SA, so it requires attribution and a link back |
| **iNaturalist API** (`/v1/taxa`) | High-quality CC-licensed photos, common names, observation counts | Filter photos to licenses that allow reuse (CC0, CC BY, CC BY-SA) |
| **GBIF API** | Occurrence data and range/density maps, plus countries where the species is found | Good for the "Where it lives" section |
| **Wikimedia Pageviews API** | Monthly views per article | Feeds the "obscurity" part of the niche score (7.2) |
All of the sources above are **free and need no API key**. The pipeline must send a descriptive `User-Agent` header (e.g., `Zoologist/1.0 (github.com/<you>/zoologist)`), which Wikimedia requires, and should stay well under rate limits (about 1 request/second per source, with retries). Conservation status comes from Wikidata's IUCN property, so the IUCN Red List API, which does need a token, isn't used.

**Fun facts** use extractive selection only:
1. **No key (default):** an extractive picker scores sentences from the Wikipedia article, favoring ones with numbers, superlatives ("largest," "only"), or unusual verbs, and lightly trims them. It works with zero setup.
2. **No LLM integration:** all fun facts use source-attributed extractive text. No model calls or API secrets are used.

The 14-day review window (7.3) is where you can catch a bad fact before it goes live.

---

## 6. Data Model

`/public/data/animals/aye-aye.json`
```json
{
  "id": "aye-aye",
  "commonName": "Aye-aye",
  "scientificName": "Daubentonia madagascariensis",
  "taxonomy": {
    "class": "Mammalia",
    "order": "Primates",
    "family": "Daubentoniidae"
  },
  "category": "mammal",
  "conservationStatus": { "code": "EN", "label": "Endangered" },
  "theme": {
    "accent": "#B4561E",
    "tokens": {
      "wash": "#FBF7F4", "soft": "#F4E7E0", "line": "#EAD0C0",
      "ink": "#241106", "muted": "#5A2B0F", "deep": "#51270E",
      "on-deep": "#F6EBE4"
    },
    "accentDark": "#E08A52",
    "source": "photo-vibrant"
  },
  "stats": {
    "weightKg":   { "min": 2.0, "max": 2.7 },
    "lengthCm":   { "min": 30,  "max": 37, "note": "body, excluding tail" },
    "lifespanYrs":{ "wild": null, "captivity": 20 },
    "diet": "Omnivore",
    "activity": "Nocturnal"
  },
  "habitat": {
    "types": ["Tropical rainforest", "Deciduous forest"],
    "ecosystemRole": "Fills the 'woodpecker niche', extracting wood-boring larvae",
    "regions": ["Madagascar"],
    "countries": ["MG"],
    "rangeMapUrl": "/img/aye-aye-range.webp"
  },
  "funFacts": [
    { "text": "It finds grubs by tapping on wood and listening for hollow spots.", "source": "https://en.wikipedia.org/wiki/Aye-aye" }
  ],
  "summary": "…2–3 paragraphs…",
  "image": {
    "src": "/img/aye-aye-1200.webp",
    "srcset": ["/img/aye-aye-600.webp 600w", "/img/aye-aye-1200.webp 1200w"],
    "alt": "An aye-aye clinging to a branch at night, large eyes and ears visible",
    "credit": "Photographer Name",
    "license": "CC BY 4.0",
    "sourceUrl": "https://www.inaturalist.org/photos/…"
  },
  "sources": ["https://www.wikidata.org/wiki/Q…", "https://en.wikipedia.org/wiki/Aye-aye"],
  "reviewed": true,
  "updatedAt": "2026-10-28"
}
```

`/public/data/schedule.json`
```json
{ "launch": "2026-11-01", "order": ["aye-aye", "blue-dragon-nudibranch", "shoebill", "…"] }
```

**Units:** store metric values and convert to imperial in the UI, with an optional toggle that remembers the choice in `localStorage` and falls back gracefully if storage is unavailable.

---

## 7. Discovering Animals Automatically

There's no hand-maintained species list. A **discovery job** pulls candidate species from open databases, scores them for how "niche but well-documented" they are, and feeds the best ones into the schedule. There are millions of described animal species, so the pool never runs out.

### 7.1 Where candidates come from
| Source | How it's queried | Why |
|---|---|---|
| **iNaturalist taxa API** | Species rank, animals only (`iconic_taxa` filter), page through by observation count | Real photos, common names, and a built-in "how known is this?" signal |
| **Wikidata SPARQL** | Taxa at species rank that have an image, an English Wikipedia article, and ideally mass/length/IUCN values | Filters to species with enough structured data to fill the stat cards |
| **GBIF species search** | Accepted species names with occurrence records | Confirms the name is valid and that a range map is possible |
| **Seed lists** *(optional)* | EDGE of Existence species, Wikipedia "unusual animals" categories | Biases the pool toward famously weird animals |

### 7.2 The "niche score"
The goal is animals that are surprising but not so obscure that there's nothing to say. Each candidate gets a score from signals like:

- **Obscurity:** Wikipedia pageviews in a middle band. Lions and dogs score low because they're too famous, and a beetle with 3 views a month and a 2-line stub also scores low.
- **Documentation:** article length, number of Wikidata stat properties present, number of research-grade iNaturalist observations.
- **Photo quality:** at least one openly licensed photo at ≥1200px.
- **Variety bonus:** boosts classes, continents, and habitats that haven't appeared recently, so the feed isn't all birds.

**Hard filters (must pass):** valid accepted species name, openly licensed photo, English article, enough source text to ground at least 3 fun facts, and at least 3 of the 6 quick stats.

### 7.3 Rolling, append-only schedule
Because the pool is dynamic, the schedule is generated a little ahead of time instead of all at once:

1. A **GitHub Actions cron job runs weekly** (or nightly). It tops up `schedule.json` so there are always about **14 future days** filled in.
2. For each open day it takes the highest-scoring candidate that hasn't been used before, then runs the normal enrich step (fetch, fun facts, accent color, image processing).
3. **Past and current days are never rewritten.** The schedule is append-only, so today's animal stays the same for everyone and old permalinks keep working.
4. The 14-day buffer is also a **review window**. New entries land in a pull request, so you can skim them and swap one out before it goes live. If you'd rather it be fully hands-off, the PR can auto-merge once validation passes.
5. If discovery fails (API down, nothing passes the filters), the job leaves the buffer as-is and the site keeps running on the days already scheduled.

### 7.4 Optional overrides
A small `overrides.json`, not a species list, lets you:
- **Pin** a specific animal to a date (e.g., penguins on World Penguin Day).
- **Block** species that should never appear.
- **Set a custom accent** for animals with an iconic color.

---

## 8. Page Behavior Details

- **Countdown:** "Next animal in Xh Ym" ticks every minute. When it hits midnight, the page re-renders, or shows a "New animal available, tap to refresh" prompt.
- **Loading:** show a skeleton placeholder sized to the final layout, so nothing jumps around (no layout shift).
- **Missing data:** hide a stat card entirely or show "Not well documented." Never show `null`.
- **Share button:** use the Web Share API, falling back to copying the link. Optionally add a permalink like `/?date=2026-10-28` for sharing a specific past day.
- **SEO and social previews:** include Open Graph tags. Since the animal changes daily, use a generic share image, or generate a per-day OG image at build time.
- **Offline:** *(v2)* a service worker caches today's JSON and image.

---

## 9. Licensing & Attribution (Important)

| Content | License | Requirement |
|---|---|---|
| Wikipedia text | CC BY-SA 4.0 | Attribute and link to the article. Edited excerpts must stay under CC BY-SA. |
| Wikidata | CC0 | None (attribution is nice anyway) |
| iNaturalist / Commons photos | Varies per photo | **Store and show the photographer, license, and link for each photo.** Exclude "All rights reserved" and NC licenses if the site might ever earn money. |
| GBIF data | Varies (mostly CC BY / CC0) | Cite the GBIF download or dataset |

The build script should **reject** any image without a recognized open license.

---

## 10. Project Structure

```
zoologist/
├── data-pipeline/
│   ├── discover.ts            # pull candidates from iNat/Wikidata/GBIF, niche score
│   ├── overrides.json         # optional pins, blocks, custom accents
│   ├── fetch.ts               # pulls Wikidata / Wikipedia / iNat / GBIF
│   ├── enrich.ts              # normalize units, fun facts, validation
│   ├── images.ts              # download + resize to WebP
│   ├── theme.ts               # extract + contrast-check accent colors
│   └── schedule.ts            # top up schedule.json ~14 days ahead (append-only)
├── public/
│   ├── data/
│   │   ├── schedule.json
│   │   └── animals/*.json
│   └── img/*.webp
├── src/
│   ├── pages/index.astro      # the single page
│   ├── components/            # Hero, StatGrid, FunFacts, RangeMap, Credits
│   ├── lib/today.ts           # dayIndex + selection logic
│   └── styles/theme.css
├── .github/workflows/discover.yml   # weekly cron: discover → commit (Vercel deploys on push)
└── README.md
```

---

## 11. Testing

- **Unit:** `dayIndex()` returns the same value across times within a day, rolls over at midnight, handles DST, and wraps around the end of the schedule.
- **Data validation:** a JSON Schema check runs in CI. The build fails if any scheduled animal lacks a licensed image, alt text, or fun facts, or if any accent fails the WCAG AA contrast check.
- **Visual:** check the page manually at 375px, 768px, and 1280px, in light and dark mode.
- **Lighthouse:** target 95+ on Performance and Accessibility.

---

## 12. Roadmap

| Phase | Scope |
|---|---|
| **MVP** | Discovery job + 14-day rolling schedule, static page, deployed |
| **v1** | Tuned niche score and variety rules, range map, unit toggle, share button |
| **v2** | Archive/calendar of past animals, PWA + offline, "guess the animal" teaser mode, daily email or push notification |
| **v3** | Streaks and favorites (needs storage, e.g., Supabase or Cloudflare D1), localization |

---

## 13. Build Spec (for Codex / one-shot build)

Everything in this section is a fixed decision, so the project can be built in one pass without follow-up questions.

### 13.1 Decisions locked in
| Question | Decision |
|---|---|
| Rendering | Astro, `output: 'static'`. The build output is `dist/` with no server functions. |
| Hosting | Vercel, framework preset **Astro**, build command `npm run build`, output directory `dist` |
| Day rollover | **Visitor's local midnight** |
| Range map | **Static image** generated at build time |
| Fun facts | Extractive only; no LLM integration |
| Past animals | Supported via `/?date=YYYY-MM-DD` for any date already in the schedule; future dates show today's animal instead |
| Units | Metric by default, toggle to imperial, choice saved in `localStorage` (wrapped in try/catch) |

### 13.2 API keys and secrets
| What | Needed? | Notes |
|---|---|---|
| iNaturalist, Wikidata, Wikipedia, Wikimedia Pageviews, GBIF | **No key** | Public read APIs. Send a `User-Agent` and throttle to about 1 req/s. |
| Vercel | **No key** | Import the GitHub repo once in the Vercel dashboard; deploys happen automatically on push |
| GitHub Actions | **No key** | Uses the built-in `GITHUB_TOKEN` (with `contents: write`) to commit new animals |
| Fun facts | **No key** | Source-attributed extractive selection only; no LLM integration |

So the answer is: **nothing is required.** Fun facts use extractive selection without an LLM key.

### 13.3 Commands
```bash
npm install
npm run discover        # tops up schedule.json ~14 days ahead (needs network)
npm run dev             # local preview
npm run build           # static build → dist/
npm test                # unit tests + data validation
```
- `npm run build` must **not** call any APIs. It only reads the committed JSON and images, so Vercel builds are fast and can't fail because an external API is down.
- `npm run discover` is the only networked step. It runs in GitHub Actions on a weekly cron (`0 9 * * 1`) and via manual `workflow_dispatch`.

### 13.4 First-run seed
The repo ships with **one complete fixture animal** (the aye-aye, matching the JSON in section 6, plus its image) and a `schedule.json` pointing every date at it until discovery runs. That way the site builds and renders correctly even in a sandbox with no network access. The first `npm run discover` run in GitHub Actions replaces the fixture schedule going forward.

### 13.5 Acceptance criteria
- [ ] `npm run build` succeeds offline and produces a static `dist/` with an `index.html`.
- [ ] The page matches the mockup: header with logo and tagline, hero photo with credit, name and scientific name, chips + IUCN badge, quick stats grid, fun facts, where it lives, about, sources, countdown + share bar.
- [ ] Every color on the page is derived from the animal's accent (section 2.1), except the IUCN badge and white stat cards.
- [ ] The accent is applied before first paint (inline script in `<head>`), so there's no color flash.
- [ ] Refreshing on the same local date shows the same animal, and it changes at local midnight.
- [ ] `npm run discover` adds new, unused, validated animals without touching any existing date.
- [ ] Missing stats render as "Not well documented," never `null` or `undefined`.
- [ ] Works at 375px width and in dark mode, with Lighthouse Performance and Accessibility ≥ 95.
- [ ] All photo credits and licenses are shown, and any image without an open license is rejected.

---

## 14. Open Questions

1. How strict should the niche score be? This needs tuning after seeing the first few weeks of picks.
2. Should new picks auto-merge, or wait for you to approve the weekly pull request?