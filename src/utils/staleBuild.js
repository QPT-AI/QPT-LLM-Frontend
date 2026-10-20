// After a deploy the old hashed chunks are gone, so a tab still running the
// previous build gets a 404 when it lazy-loads a scene. Reload once to pick up
// the new index.html; the timestamp guard stops a reload loop if the chunk is
// really missing.
const RELOAD_KEY = "qpt-chunk-reload";
const RELOAD_GUARD_MS = 10_000;

export function isChunkLoadError(error) {
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    String(error?.message ?? error)
  );
}

export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // no storage → no loop guard → don't risk reloading
  }
  window.location.reload();
  return true;
}
