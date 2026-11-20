My favorite show as a kid was Wild Kratts.

# Zoologist

Zoologist introduces one animal each day through photography, facts, and information about its habitat, diet, size, and conservation status. Each daily feature includes sources and photo credits, with dated links for sharing past discoveries.

## Architecture

The website is built with Astro and TypeScript and deployed as static files on Vercel. The browser selects the day's animal from a date-based schedule, changing at the visitor's local midnight. Animal records and images are stored in the repository; the live website requires no backend or database.

A Node.js pipeline gathers species information from Wikipedia, Wikidata, iNaturalist, and GBIF, processes images, and validates records before adding them to the schedule. GitHub Actions runs discovery twice a day to maintain a 14-day buffer, preserves previously scheduled animals, and checks the site before committing updates and requesting deployment. If the buffer runs out, the site rotates through previously published animals until discovery catches up.

Set the repository's `VERCEL_DEPLOY_HOOK` Actions secret to a Vercel Deploy Hook for the default branch. Discovery saves validated progress even if the deployment request fails. The next scheduled deployment or a manual run can retry the request.
