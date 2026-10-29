import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFacts,factProblem,explicitTraits } from '../data-pipeline/enrich';
const hunting='Red-shouldered hawks hunt by watching from a perch and dropping onto small animals on the ground.';
const migration='Red-shouldered hawks typically migrate alone, although they sometimes form small flocks of three or more birds.';
const nesting='The birds build their nests high in trees and use branches to support the eggs and growing young.';
test('taxonomy headings and list fragments never become facts',()=>{
 const article=`${hunting}\n\n== Taxonomy ==\nThe hawk was formally described in 1788 by a German naturalist who placed it in the genus Falco.\n=== Subspecies ===\nB. l. alleni Ridgway, 1885 – central south Texas to North Carolina and north Florida (USA) B.\n\n== Behavior ==\n${migration}\n\n${nesting}\n\n== References ==\nThis animal hunts with an imaginary laser and this reference text must never be selected as a fact.`;
 const facts=extractFacts(article,'https://example.org');
 assert.deepEqual(new Set(facts.map(f=>f.text)),new Set([hunting,migration,nesting]));
 assert.ok(factProblem('alleni Ridgway, 1885 – central south Texas to North Carolina and north Florida (USA) B.'));
});
test('sentence boundaries preserve decimal values and complete parentheses',()=>{
 const sentence='The animal can weigh 2.5 kg (5.5 lb) and hunts for small prey beneath the forest canopy.';
 assert.deepEqual(extractFacts(sentence,'https://example.org').map(f=>f.text),[sentence]);
 assert.ok(factProblem('The animal hunts in forests (especially near rivers and it catches small prey.'));
});
test('never stitches separate list rows or unfinished prose into a fact',()=>{
 const article='alleni Ridgway, 1885 – central south Texas to North Carolina\nB. l. elegans Cassin, 1855 – California\nThe bird can hunt small prey but this paragraph has no ending';
 assert.deepEqual(extractFacts(article,'https://example.org'),[]);
});
test('duplicate sentences and reference markup are rejected',()=>{
 const facts=extractFacts(`${hunting}\n${hunting}`,'https://example.org');assert.equal(facts.length,1);
 assert.ok(factProblem(`== Behavior == ${hunting}`));
});
test('an article mentioning nocturnal predators cannot classify its subject as nocturnal',()=>{
 const text='The great horned owl is nocturnal and hunts smaller birds, including red-shouldered hawks.\nRed-shouldered hawks are diurnal and forage during the daylight hours.';
 assert.deepEqual(explicitTraits(text,['Red-shouldered hawk','Buteo lineatus']),{activity:'Diurnal',livesIn:null});
 assert.equal(explicitTraits('Its predators include nocturnal owls that hunt in forests at night.',['Red-shouldered hawk']).activity,null);
});
