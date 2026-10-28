# Zoologist

One remarkable animal each day. A static Astro website based on `ZOOLOGIST.md` and the supplied PNG mockup, with self-hosted Fredoka and Nunito, animal-derived light/dark themes, local-midnight rollover, sourced facts, and licensed photography. Fun facts are extractive only: no LLM integration or secrets.

## Run locally

```sh
npm install
npm run dev
```

Open the printed local URL (normally http://127.0.0.1:4321). Astro requires Node >=22.23.4. A project-local Node 22 runtime is included as a development dependency so npm scripts also work on the older system Node used during development. Set `ASTRO_TELEMETRY_DISABLED=1` if desired.

```sh
npm test               # date, DST, content, contrast, and sharing tests + data validation
npm run typecheck
npm run build          # validates committed content, then writes static dist/
npm run preview
npm run discover       # networked; adds up to 14 future days
```

Builds make no external content requests. Once dependencies are installed, committed images, JSON, and fonts are sufficient for an offline build.

## First version

The complete aye-aye fixture ships with two WebP sizes and an original, explicitly labeled Madagascar schematic. The seed schedule launches October 28, 2026. Until discovery fills upcoming dates, the fixture remains the fallback. The range illustration is not a GBIF density map. New discoveries receive static GBIF occurrence maps over a credited GBIF basemap; observed locations may include captive or introduced records and are not a native-range boundary.

The page includes six quick stats, source-linked fun facts, habitat, an original about section, sources, a countdown, and sharing. Metric is the default; imperial preference persists when local storage is available. Dark mode follows the device setting. Stat cards remain white as specified in the plan.

Share uses the device’s native sheet where supported. Otherwise it copies a dated permalink; if clipboard access fails, it displays a manually copyable URL. Canceling the native sheet is silent. `/?date=YYYY-MM-DD` selects a scheduled past date. Invalid, future, and out-of-schedule requests show today. Dates use the visitor’s local calendar; visitors in different timezones may be on different daily selections. An exhausted schedule uses the explicit fallback without wrapping or changing old entries.

## Discovery and review

`npm run discover` is the only networked content step. It queries active iNaturalist species, checks exact accepted GBIF names, extracts Wikipedia sentences, reads available Wikidata measurements and conservation status, checks image reuse licenses, generates WebP images and maps, derives an AA-checked palette with Sharp, scores documentation and obscurity using pageviews, and prefers a different class from the previous day. APIs are throttled per host and retried. Candidate failures are isolated; schedule writes are atomic. Previously scheduled dates and species are preserved, including the fixture’s scientific name.

The job considers a bounded pool of candidates (up to 100 across eight result pages). It may produce fewer than 14 new days when APIs or content quality prevent filling the buffer. Run it again later to resume. Individual failures are logged, and no-candidate runs fail without replacing the schedule. Unknown diet, lifespan context, habitat details, and measurements are not invented. Lifespan is deliberately left unknown in automatically generated entries until its wild/captivity context is reviewed.

Edit `data-pipeline/overrides.json` for blocked species (scientific name or generated slug), accent overrides keyed by slug, and pins mapping ISO dates to generated slugs. Pins must be available in the current candidate pool; an unavailable pin stops scheduling instead of silently substituting another animal. Existing dates cannot be repinned.

`.github/workflows/discover.yml` runs Mondays at 09:00 UTC or on manual dispatch. It opens a review PR rather than auto-merging. Enable GitHub Actions’ permission to create pull requests in repository settings. Review photo attribution/license metadata, measurements, context of extracted facts, occurrence records, and conservation status before merging; set each animal’s `reviewed` field to true after review. Automated entries start as `reviewed: false`. The build validates content/assets/contrast but does not claim to replace editorial review.

## Vercel

Import this repository in Vercel with the **Astro** preset, `npm run build`, output `dist`, and a supported Node 22 or newer runtime. No server adapter, database, or API keys are needed. Pushes to the connected production branch deploy normally; merging a discovery PR updates the daily catalog. This workspace implementation has not been published or pushed.

## Credits

Fixture photo: [nomis-simon, Wild aye aye](https://commons.wikimedia.org/wiki/File:Wild_aye_aye.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), resized and converted to WebP. See the site’s per-fact links and sources for biology references. The fixture summary is original prose. Generated Wikipedia extracts are attributed and licensed CC BY-SA 4.0; photo licenses remain independent. Map tile attribution and occurrence-data credits are stored with each generated animal.
