import UsersFetcher from 'src/fetchers/UsersFetcher';

/**
 * Session cache for LLM provider model lists.
 *
 * Asking for a provider's model list makes the ELN server call that provider's
 * `/v1/models` endpoint, so re-fetching it every time the user flips the "LLM
 * Provider" radio or the "API protocol" select would hammer both. The set of
 * models a provider offers changes on the order of weeks, so the lists are
 * memoised here per provider identity — module level, so they also survive
 * remounting the AI settings tab.
 *
 * Identity is `protocol + base_url` (the endpoint decides which models exist).
 * The API key is deliberately NOT part of it: the key field changes on every
 * keystroke, and blanking the dropdown while someone pastes a key would be a
 * regression. A successful "Test connection" re-fetches with `force`, which asks
 * the server to re-read the catalogue too — that is what makes a key/tenant swap
 * show its own list. The server cache (LlmModelCatalog) does key on the key
 * digest, since it is shared across users.
 *
 * Because the cache is module level it outlives a component but not a page load:
 * nothing here is persisted — no localStorage, no sessionStorage. It is also
 * scoped to one user, see `scopeToUser`.
 */

const TTL_MS = 30 * 60 * 1000;
// A provider that answered with nothing is retried far sooner than a successful
// one is refreshed — but not immediately, so flipping back and forth between an
// unreachable provider and a working one cannot turn into a request per click.
const MISS_TTL_MS = 60 * 1000;

// key -> { models: string[], fetchedAt: number } — successful lookups only
const entries = new Map();
// key -> timestamp of the last lookup that came back empty
const misses = new Map();
// key -> Promise<string[]>, so concurrent callers share one request
const inflight = new Map();
// key -> number, bumped whenever a lookup for that key is superseded. A response
// carrying an outdated generation is discarded instead of being written, so a slow
// request cannot overwrite the result of the forced refetch that replaced it.
const generations = new Map();
// Bumped by clearModelCache. Clearing resets the per-key generations to 0, so on
// its own a generation can no longer tell a request started before the clear from
// one started after it — this survives the clear and does.
let epoch = 0;
// The user the cached lists belong to (see scopeToUser).
let scopedUserId = null;
// Notified whenever a stored list changes, so components reading through
// `peekModels` during render can re-render. React 17 here, so this is a plain
// listener set rather than useSyncExternalStore.
const listeners = new Set();

function generationOf(key) {
  return generations.get(key) || 0;
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Subscribe to "a stored list changed". Returns an unsubscribe function, so it
 * can be returned straight from a useEffect.
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable cache identity for a custom (personal) provider config. */
export function customModelsKey({ protocol, baseUrl } = {}) {
  return ['custom', protocol || 'openai', (baseUrl || '').trim().replace(/\/+$/, '')].join('|');
}

/**
 * Stable cache identity for one institution provider. Keyed by id like a saved
 * personal provider — an institution may run several, and each offers its own
 * models. A blank id is the provider that serves this user, whichever it is.
 */
export function institutionModelsKey(id) {
  return id ? `institution|${id}` : 'institution';
}

/**
 * Stable cache identity for one of the user's SAVED providers. Keyed by id
 * rather than by protocol + endpoint: a saved provider is a record, and two of
 * them may legitimately share an endpoint while holding different keys (two
 * tenants of the same service), which is exactly the case the endpoint-based
 * identity cannot tell apart.
 */
export function providerModelsKey(id) {
  return `provider|${id}`;
}

/**
 * Synchronous, non-fetching read: the last list we got for `key`, or null if we
 * never got one. Safe to call while rendering — this is what lets the dropdown
 * repopulate the instant the user returns to a provider they already looked at.
 *
 * Age is deliberately ignored here: a stale-but-known list is a better dropdown
 * than an empty one. The TTL only governs whether a *fetch* may reuse the entry.
 */
export function peekModels(key) {
  const hit = entries.get(key);
  return hit ? hit.models : null;
}

function isFresh(key) {
  const hit = entries.get(key);
  return !!hit && Date.now() - hit.fetchedAt <= TTL_MS;
}

function recentlyMissed(key) {
  const at = misses.get(key);
  return !!at && Date.now() - at <= MISS_TTL_MS;
}

function loadCached(key, loader, { force = false } = {}) {
  if (force) {
    // Bypass the freshness checks but keep any known list: should the provider
    // answer with nothing this time, a stale list still beats an empty dropdown.
    // Bumping the generation retires whatever is already in flight for this key,
    // so its (older) answer can no longer land after ours.
    misses.delete(key);
    inflight.delete(key);
    generations.set(key, generationOf(key) + 1);
  } else {
    if (isFresh(key)) return Promise.resolve(entries.get(key).models);
    const pending = inflight.get(key);
    if (pending) return pending;
    if (recentlyMissed(key)) return Promise.resolve(peekModels(key) || []);
  }

  const generation = generationOf(key);
  const startedEpoch = epoch;
  const request = loader({ refresh: force })
    .then((models) => {
      const list = Array.isArray(models) ? models : [];
      // A newer lookup for this key has since been started, or the cache was
      // cleared (a user switch) — that answer is returned to our caller but not
      // stored, so it cannot land in another user's cache.
      if (startedEpoch !== epoch || generation !== generationOf(key)) return list;
      // An empty list means "unreachable / wrong key / provider lists nothing".
      // It is not stored as an answer — that would keep the dropdown empty even
      // after the user fixes the config — only noted, so it isn't retried at
      // click speed. Any previously known list is left in place.
      if (list.length > 0) {
        entries.set(key, { models: list, fetchedAt: Date.now() });
        misses.delete(key);
        notify();
      } else {
        misses.set(key, Date.now());
      }
      return list;
    })
    .catch(() => [])
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/** Models offered by one institution provider. */
export function fetchInstitutionModels(id, { force = false } = {}) {
  return loadCached(
    institutionModelsKey(id),
    (opts) => UsersFetcher.fetchInstitutionLlmModels(id, opts),
    { force },
  );
}

/**
 * Models offered by a supplied (possibly unsaved) custom provider config.
 * `model` is passed through to the API but is not part of the cache identity.
 */
export function fetchCustomModels(config = {}, { force = false } = {}) {
  return loadCached(
    customModelsKey(config),
    (opts) => UsersFetcher.fetchLlmModelsForConfig({ ...config, ...opts }),
    { force },
  );
}

/** Models offered by one of the user's saved providers. */
export function fetchProviderModels(id, { force = false } = {}) {
  return loadCached(
    providerModelsKey(id),
    (opts) => UsersFetcher.fetchLlmProviderModels(id, opts),
    { force },
  );
}

/** Forget everything, including which user it was bound to (used by tests). */
export function clearModelCache() {
  entries.clear();
  misses.clear();
  inflight.clear();
  generations.clear();
  epoch += 1;
  scopedUserId = null;
  notify();
}

/**
 * Bind the cache to one user, dropping everything if it was holding another
 * user's lists. A custom endpoint's model names are that user's to see, and the
 * cache lives in the module rather than the session, so a sign-out that does not
 * reload the bundle would otherwise carry them over to whoever signs in next.
 */
export function scopeToUser(userId) {
  if (userId === undefined || userId === null || userId === scopedUserId) return;
  if (scopedUserId !== null) clearModelCache();
  scopedUserId = userId;
}
