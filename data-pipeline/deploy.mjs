// Keep the hook (a deployment credential) in environment memory, never logs.
const hook = process.env.VERCEL_DEPLOY_HOOK;
if (!hook) throw new Error('Missing VERCEL_DEPLOY_HOOK repository secret.');
let url;
try { url = new URL(hook); } catch { throw new Error('Invalid Vercel Deploy Hook URL.'); }
if (url.protocol !== 'https:' || url.hostname !== 'api.vercel.com' || !url.pathname.startsWith('/v1/integrations/deploy/')) {
  throw new Error('Expected a Vercel Deploy Hook URL.');
}
let accepted = false;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(30000) });
    if (response.ok) { accepted = true; break; }
    if (response.status < 500 && response.status !== 429) break;
  } catch { /* Retry without printing the credential-bearing URL. */ }
  if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
}
if (!accepted) throw new Error('Vercel deployment request failed. Check the hook secret and Vercel status, then rerun the workflow.');
console.log('Vercel accepted the deployment request. Check its dashboard for the build result.');
