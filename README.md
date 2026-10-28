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

## Automatic discovery

`npm run discover` is the only networked content step. It queries active iNaturalist species, checks exact accepted GBIF names, extracts Wikipedia sentences, reads available Wikidata measurements and conservation status, checks image reuse licenses, generates WebP images and maps, derives an AA-checked palette with Sharp, scores documentation and obscurity using pageviews, and prefers a different class from the previous day. APIs are throttled per host and retried. Candidate failures are isolated; schedule writes are atomic. Previously scheduled dates and species are preserved, including the fixture’s scientific name.

The job considers a bounded pool of candidates (up to 100 across eight result pages). It may produce fewer than 14 new days when APIs or content quality prevent filling the buffer. The next daily workflow run resumes automatically. Individual failures are logged. A source outage fails the run without publishing; successful searches with no suitable animals advance the discovery cursor and preserve the existing schedule. Unknown diet, lifespan context, habitat details, and measurements are not invented. Lifespan is deliberately left unknown in automatically generated entries until its wild/captivity context is reviewed.

Edit `data-pipeline/overrides.json` for blocked species (scientific name or generated slug), accent overrides keyed by slug, and pins mapping ISO dates to generated slugs. Pins must be available in the current candidate pool; an unavailable pin stops scheduling instead of silently substituting another animal. Existing dates cannot be repinned.

`.github/workflows/discover.yml` runs automatically on relevant pushes to the default branch, daily at 09:23 UTC, and on manual dispatch. It keeps a 14-day buffer, verifies that existing schedule entries are unchanged, runs TypeScript checks, tests, and a static build, then commits validated data directly to the default branch and requests a Vercel deployment. There are no review PRs or manual merges. The job uses the earliest global calendar date (UTC+14) to maintain the buffer ahead of every visitor’s local midnight. A persisted candidate-page cursor avoids repeatedly searching only the first species results.

Generated entries remain `reviewed: false`: automated schema, source, license, and contrast checks are not human editorial review. There is no LLM integration. An external API outage or validation failure leaves published content intact and the daily schedule retries later. This is unattended routine operation, not a guarantee against third-party outages. Failed workflow notifications and Vercel build results remain useful for exceptional failures.

### One-time setup

1. Push this repository to its default branch and import it in Vercel, with that same branch as the production branch.
2. In Vercel, open **Project Settings → Git → Deploy Hooks**, create a hook for the production branch, and copy its URL. See [Vercel’s Deploy Hook documentation](https://vercel.com/docs/deploy-hooks).
3. In GitHub, add an **Actions repository secret** named `VERCEL_DEPLOY_HOOK` containing that URL. Treat it as a credential; do not commit it or paste it into issue logs.
4. Ensure GitHub Actions is enabled and repository/organization policy permits this workflow’s `contents: write` permission and direct pushes to the default branch. Existing rules requiring PR approval can prevent unattended commits; this workflow does not bypass branch protections.
5. After adding the secret, run **Discover animals → Run workflow** once, or wait for the next daily run. Subsequent relevant pushes also start it automatically.

The deployment hook explicitly requests a Vercel build of the latest committed default branch. It is called after successful validation and push, including on no-change runs, so a failed deployment request is retried by the next scheduled run. A successful workflow hook step means Vercel accepted the request; Vercel’s dashboard reports the actual deployment result. The normal Vercel Git integration can remain enabled. No personal access token, Vercel API token, or biology API key is needed.

## Vercel

Import this repository in Vercel with the **Astro** preset, `npm run build`, output `dist`, and a supported Node 22 or newer runtime. No server adapter, database, or API keys are needed. Pushes to the connected production branch deploy normally; the daily workflow commits discoveries and requests deployment automatically. This workspace implementation has not been published or pushed.

## Credits

Fixture photo: [nomis-simon, Wild aye aye](https://commons.wikimedia.org/wiki/File:Wild_aye_aye.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), resized and converted to WebP. See the site’s per-fact links and sources for biology references. The fixture summary is original prose. Generated Wikipedia extracts are attributed and licensed CC BY-SA 4.0; photo licenses remain independent. Map tile attribution and occurrence-data credits are stored with each generated animal.

## Phone home-screen icon

The home-screen icon uses the orange outlined paw from the header/mockup on a warm cream background. Apple touch (180px), manifest (192px/512px, with safe padding for masking), and browser icons are bundled. The manifest opens the saved site at today’s animal in a standalone window. It does not add offline caching.

After deployment, open the site on your phone and use **Add to Home Screen**. If you already saved an older icon, remove that shortcut and add the site again to refresh it. To regenerate icon PNGs after editing `public/icons/paw.svg`, run `node scripts/generate-icons.mjs`.
