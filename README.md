My favorite show as a kid was Wild Kratts.

# Zoologist

Zoologist introduces one animal each day through photography, facts, and information about its habitat, diet, size, and conservation status. Each daily feature includes sources and photo credits, with dated links for sharing past discoveries.

## Architecture

The website is built with Astro and TypeScript and deployed as static files on Vercel. The browser selects the day's animal from a date-based schedule, changing at the visitor's local midnight. Animal records and images are stored in the repository; the live website requires no backend or database.

A Node.js pipeline gathers species information from Wikipedia, Wikidata, iNaturalist, and GBIF, processes images, and validates records before adding them to the schedule. GitHub Actions runs discovery daily to maintain a 14-day buffer, preserves previously scheduled animals, and checks the site before committing updates and requesting deployment.
