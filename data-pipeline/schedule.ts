import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { discoverCandidates, type Candidate } from './discover';
import { fetchAnimal } from './fetch';
import { backfillElapsedDays, futureDays } from './scheduling';
import { makeTheme } from './theme';
import type { Animal } from './types';
import { validateAnimal } from './validate';
import { dayIndex, localDate, type Schedule } from '../src/lib/today';

const schedulePath = 'public/data/schedule.json';
const statePath = 'data-pipeline/discovery-state.json';
const animalDirectory = 'public/data/animals';
const schedule: Schedule = JSON.parse(await readFile(schedulePath, 'utf8'));
const overrides = JSON.parse(await readFile('data-pipeline/overrides.json', 'utf8'));
const today = process.env.SCHEDULE_DATE ?? localDate();
const current = Math.max(0, dayIndex(today, schedule.launch));
const target = current + futureDays + 1;
const order = backfillElapsedDays(schedule, current);
const needs = target - order.length;
const minQuickStats = order.length <= current + 7 ? 2 : 3;
if (needs <= 0) {
  console.log(`Schedule already has at least ${futureDays} future days.`);
  process.exit(0);
}

const used = new Set([...order, schedule.fallback]);
const usedNames = new Set<string>();
for (const id of used) {
  const animal: Animal = JSON.parse(await readFile(`${animalDirectory}/${id}.json`, 'utf8'));
  usedNames.add(animal.scientificName);
}
const blocked = new Set<string>(overrides.blocked);
const pool: { animal: Animal; score: number }[] = [];
const eligible = (id: string, name: string) =>
  !used.has(id) && !usedNames.has(name) && !blocked.has(id) && !blocked.has(name);

function addCandidate(animal: Animal, score: number) {
  pool.push({ animal, score });
  used.add(animal.id);
  usedNames.add(animal.scientificName);
}

// Reuse validated species left over from earlier runs, even during an API outage.
for (const file of (await readdir(animalDirectory)).sort()) {
  if (!file.endsWith('.json') || used.has(file.slice(0, -5))) continue;
  try {
    const animal: Animal = JSON.parse(await readFile(`${animalDirectory}/${file}`, 'utf8'));
    if (file !== `${animal.id}.json` || !eligible(animal.id, animal.scientificName)) continue;
    await validateAnimal(animal);
    addCandidate(animal, 0);
  } catch (error) {
    console.warn(`Skipped cached animal ${file}: ${String(error)}`);
  }
}

const state = JSON.parse(await readFile(statePath, 'utf8'));
let nextPage = Number.isInteger(state.nextPage) && state.nextPage >= 1 && state.nextPage <= 100 ? state.nextPage : 1;
let nextOffset = Number.isInteger(state.nextOffset) && state.nextOffset >= 0 && state.nextOffset <= 100 ? state.nextOffset : 0;
const deadline = Date.now() + 12 * 60_000;
let inspected = 0;
let pagesFetched = 0;

if (pool.length < needs) {
  while (pagesFetched < 8 && inspected < 100 && Date.now() < deadline && pool.length < needs + 4) {
    let candidates: Candidate[];
    try {
      candidates = await discoverCandidates(nextPage);
    } catch (error) {
      console.warn('Candidate API unavailable:', String(error));
      break;
    }
    pagesFetched++;
    while (nextOffset < candidates.length && inspected < 100 && Date.now() < deadline && pool.length < needs + 4) {
      const candidate = candidates[nextOffset++];
      if (!candidate.wikipedia_url || !candidate.preferred_common_name || candidate.rank !== 'species') continue;
      const id = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!eligible(id, candidate.name)) continue;
      inspected++;
      try {
        const { animal, score } = await fetchAnimal(candidate, overrides.accents[id], minQuickStats);
        await validateAnimal(animal);
        addCandidate(animal, score);
        console.log(`Candidate: ${animal.commonName}`);
      } catch (error) {
        console.warn(`Skipped ${candidate.name}: ${String(error)}`);
      }
    }
    if (nextOffset >= candidates.length) {
      nextPage = candidates.length ? (nextPage % 100) + 1 : 1;
      nextOffset = 0;
    }
  }
}

pool.sort((a, b) => b.score - a.score);
let previous: Animal | undefined = order.length
  ? JSON.parse(await readFile(`${animalDirectory}/${order.at(-1)}.json`, 'utf8'))
  : undefined;
let added = 0;
while (order.length < target && pool.length) {
  const date = new Date(Date.parse(schedule.launch + 'T00:00:00Z') + order.length * 86400000).toISOString().slice(0, 10);
  const pin = overrides.pins[date];
  let index = pin
    ? pool.findIndex(({ animal }) => animal.id === pin)
    : pool.findIndex(({ animal }) => animal.taxonomy.class !== previous?.taxonomy.class);
  if (pin && index < 0) {
    console.warn(`Pinned species ${pin} unavailable on ${date}.`);
    break;
  }
  if (index < 0) index = 0;
  const { animal } = pool.splice(index, 1)[0];
  if (overrides.accents[animal.id]) {
    animal.theme = makeTheme(overrides.accents[animal.id]);
    await validateAnimal(animal);
    await writeFile(`${animalDirectory}/${animal.id}.json`, JSON.stringify(animal, null, 2) + '\n');
  }
  order.push(animal.id);
  previous = animal;
  added++;
}

if (added) {
  await writeFile(`${schedulePath}.tmp`, JSON.stringify({ ...schedule, order }, null, 2) + '\n');
  await rename(`${schedulePath}.tmp`, schedulePath);
}
if (pagesFetched) {
  await writeFile(statePath, JSON.stringify({ nextPage, nextOffset }, null, 2) + '\n');
}
const future = Math.max(0, (added ? order.length : schedule.order.length) - current - 1);
console.log(`Appended ${added} animals. ${future} future days scheduled.`);
if (future < futureDays) {
  const message = `Discovery buffer is below target (${future}/${futureDays} future days).`;
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${message}` : message);
}
