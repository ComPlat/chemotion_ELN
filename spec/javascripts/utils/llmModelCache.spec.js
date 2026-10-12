import expect from 'expect';
import UsersFetcher from '../../../app/javascript/src/fetchers/UsersFetcher';
import {
  institutionModelsKey,
  peekModels,
  fetchInstitutionModels,
  fetchProviderModels,
  providerModelsKey,
  invalidate,
  clearModelCache,
  subscribe,
  scopeToUser,
} from '../../../app/javascript/src/utilities/llmModelCache';

describe('llmModelCache', () => {
  const originalInstitution = UsersFetcher.fetchInstitutionLlmModels;
  const originalProvider = UsersFetcher.fetchLlmProviderModels;

  let institutionCalls;
  let providerCalls;
  // What a saved provider answers, by id; ids not listed answer `model-of-<id>`.
  let providerResponses;

  beforeEach(() => {
    clearModelCache();
    institutionCalls = [];
    UsersFetcher.fetchInstitutionLlmModels = (id, opts) => {
      institutionCalls.push({ id, ...opts });
      return Promise.resolve([`kit.model-of-${id}`]);
    };
    providerCalls = [];
    providerResponses = {};
    UsersFetcher.fetchLlmProviderModels = (id, opts) => {
      providerCalls.push({ id, ...opts });
      return Promise.resolve(providerResponses[id] || [`model-of-${id}`]);
    };
  });

  after(() => {
    UsersFetcher.fetchInstitutionLlmModels = originalInstitution;
    UsersFetcher.fetchLlmProviderModels = originalProvider;
    clearModelCache();
  });

  describe('fetchProviderModels', () => {
    it('caches per saved provider, so two providers never share a list', async () => {
      expect(await fetchProviderModels(1)).toEqual(['model-of-1']);
      expect(await fetchProviderModels(2)).toEqual(['model-of-2']);

      expect(peekModels(providerModelsKey(1))).toEqual(['model-of-1']);
      expect(peekModels(providerModelsKey(2))).toEqual(['model-of-2']);
      expect(providerCalls.map((c) => c.id)).toEqual([1, 2]);
    });

    it('serves a repeat lookup from the cache without a second request', async () => {
      await fetchProviderModels(1);
      const second = await fetchProviderModels(1);

      expect(providerCalls.length).toEqual(1);
      expect(second).toEqual(['model-of-1']);
    });

    it('shares one request between concurrent lookups', async () => {
      const results = await Promise.all([
        fetchProviderModels(1),
        fetchProviderModels(1),
        fetchProviderModels(1),
      ]);

      expect(providerCalls.length).toEqual(1);
      expect(results[2]).toEqual(['model-of-1']);
    });

    it('re-reads when forced', async () => {
      await fetchProviderModels(1);
      await fetchProviderModels(1, { force: true });

      expect(providerCalls.length).toEqual(2);
      expect(providerCalls[1].refresh).toEqual(true);
    });

    it('does not cache an empty answer as the list for that provider', async () => {
      providerResponses[1] = [];
      await fetchProviderModels(1);

      expect(peekModels(providerModelsKey(1))).toEqual(null);
    });

    it('does not re-request straight away after an empty answer', async () => {
      providerResponses[1] = [];
      await fetchProviderModels(1);
      await fetchProviderModels(1);

      expect(providerCalls.length).toEqual(1);
    });

    it('keeps a known list when a later lookup comes back empty', async () => {
      await fetchProviderModels(1);
      providerResponses[1] = [];
      await fetchProviderModels(1, { force: true });

      expect(peekModels(providerModelsKey(1))).toEqual(['model-of-1']);
    });
  });

  describe('switching between providers', () => {
    it('keeps each provider list, so switching back needs no request', async () => {
      await fetchProviderModels(1);
      await fetchProviderModels(2);
      await fetchProviderModels(1);

      expect(peekModels(providerModelsKey(1))).toEqual(['model-of-1']);
      expect(peekModels(providerModelsKey(2))).toEqual(['model-of-2']);
      expect(providerCalls.length).toEqual(2);
    });

    it('keeps the institution list separate from a saved provider with the same id', async () => {
      await fetchInstitutionModels(7);
      await fetchProviderModels(7);

      expect(peekModels(institutionModelsKey(7))).toEqual(['kit.model-of-7']);
      expect(peekModels(providerModelsKey(7))).toEqual(['model-of-7']);
    });

    it('caches per institution provider, so two of them never share a list', async () => {
      await fetchInstitutionModels(7);
      await fetchInstitutionModels(8);

      expect(peekModels(institutionModelsKey(7))).toEqual(['kit.model-of-7']);
      expect(peekModels(institutionModelsKey(8))).toEqual(['kit.model-of-8']);
      expect(institutionCalls.map((c) => c.id)).toEqual([7, 8]);
    });

    it('fetches one institution provider’s list once per session', async () => {
      await fetchInstitutionModels(7);
      await fetchInstitutionModels(7);

      expect(institutionCalls.length).toEqual(1);
    });
  });

  describe('peekModels', () => {
    it('returns null for a provider that was never looked up', () => {
      expect(peekModels(providerModelsKey(99))).toEqual(null);
    });
  });

  describe('asking the server to refresh', () => {
    it('does not ask the server to re-read the catalogue on an ordinary lookup', async () => {
      await fetchProviderModels(1);
      await fetchInstitutionModels(7);

      expect(providerCalls[0].refresh).toEqual(false);
      expect(institutionCalls[0].refresh).toEqual(false);
    });

    it('asks the server to re-read the catalogue when forced', async () => {
      await fetchProviderModels(1, { force: true });
      await fetchInstitutionModels(7, { force: true });

      expect(providerCalls[0]).toEqual({ id: 1, refresh: true });
      expect(institutionCalls[0]).toEqual({ id: 7, refresh: true });
    });
  });

  describe('a superseded lookup', () => {
    it('cannot overwrite the list a later forced lookup stored', async () => {
      let releaseSlow;
      UsersFetcher.fetchLlmProviderModels = () => new Promise((resolve) => {
        releaseSlow = () => resolve(['stale-model']);
      });
      const slow = fetchProviderModels(1);

      UsersFetcher.fetchLlmProviderModels = () => Promise.resolve(['fresh-model']);
      await fetchProviderModels(1, { force: true });
      expect(peekModels(providerModelsKey(1))).toEqual(['fresh-model']);

      releaseSlow();
      await slow;

      expect(peekModels(providerModelsKey(1))).toEqual(['fresh-model']);
    });
  });

  describe('invalidate', () => {
    it('drops the known list, so an edited provider that now lists nothing offers nothing', async () => {
      providerResponses[7] = ['gpt-4o', 'gpt-4o-mini'];
      await fetchProviderModels(7);

      invalidate(providerModelsKey(7));
      providerResponses[7] = [];
      await fetchProviderModels(7, { force: true });

      expect(peekModels(providerModelsKey(7))).toEqual(null);
    });

    it('lets the next lookup through despite a recent empty answer', async () => {
      providerResponses[7] = [];
      await fetchProviderModels(7);

      invalidate(providerModelsKey(7));
      providerResponses[7] = ['claude-opus-5'];

      expect(await fetchProviderModels(7)).toEqual(['claude-opus-5']);
      expect(providerCalls.length).toEqual(2);
    });

    it('discards a lookup that was in flight', async () => {
      let releaseSlow;
      UsersFetcher.fetchLlmProviderModels = () => new Promise((resolve) => {
        releaseSlow = () => resolve(['old-endpoint-model']);
      });
      const slow = fetchProviderModels(7);

      invalidate(providerModelsKey(7));
      releaseSlow();
      await slow;

      expect(peekModels(providerModelsKey(7))).toEqual(null);
    });

    it('starts a new request rather than joining the one in flight', async () => {
      const pending = [];
      UsersFetcher.fetchLlmProviderModels = (id) => {
        providerCalls.push({ id });
        return new Promise((resolve) => { pending.push(resolve); });
      };
      fetchProviderModels(7);

      invalidate(providerModelsKey(7));
      fetchProviderModels(7);
      pending.forEach((resolve) => resolve([]));

      expect(providerCalls.length).toEqual(2);
    });

    it('leaves the other providers alone and tells listeners', async () => {
      await fetchProviderModels(1);
      await fetchProviderModels(7);
      let notifications = 0;
      const unsubscribe = subscribe(() => { notifications += 1; });

      invalidate(providerModelsKey(7));
      unsubscribe();

      expect(notifications).toEqual(1);
      expect(peekModels(providerModelsKey(1))).toEqual(['model-of-1']);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners when a list is stored, and stops after unsubscribing', async () => {
      let notifications = 0;
      const unsubscribe = subscribe(() => { notifications += 1; });

      await fetchProviderModels(1);
      expect(notifications).toEqual(1);

      unsubscribe();
      await fetchInstitutionModels(7);
      expect(notifications).toEqual(1);
    });

    it('does not notify when the answer was empty and nothing was stored', async () => {
      let notifications = 0;
      const unsubscribe = subscribe(() => { notifications += 1; });
      providerResponses[1] = [];

      await fetchProviderModels(1);

      expect(notifications).toEqual(0);
      unsubscribe();
    });
  });

  describe('scopeToUser', () => {
    it('drops another user’s cached lists', async () => {
      scopeToUser(1);
      await fetchProviderModels(7);
      expect(peekModels(providerModelsKey(7))).toEqual(['model-of-7']);

      scopeToUser(2);

      expect(peekModels(providerModelsKey(7))).toEqual(null);
    });

    it('keeps the cache for the same user', async () => {
      scopeToUser(1);
      await fetchProviderModels(7);
      scopeToUser(1);

      expect(peekModels(providerModelsKey(7))).toEqual(['model-of-7']);
    });

    it('does not store a request that was in flight when the user switched', async () => {
      let releaseSlow;
      UsersFetcher.fetchLlmProviderModels = () => new Promise((resolve) => {
        releaseSlow = () => resolve(['user-1-model']);
      });
      scopeToUser(1);
      const slow = fetchProviderModels(7);

      scopeToUser(2);
      releaseSlow();
      await slow;

      expect(peekModels(providerModelsKey(7))).toEqual(null);
    });

    it('keeps the cache when the user is not known yet', async () => {
      scopeToUser(1);
      await fetchProviderModels(7);
      scopeToUser(undefined);
      scopeToUser(null);

      expect(peekModels(providerModelsKey(7))).toEqual(['model-of-7']);
    });
  });
});
