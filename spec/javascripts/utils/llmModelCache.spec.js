import expect from 'expect';
import UsersFetcher from '../../../app/javascript/src/fetchers/UsersFetcher';
import {
  customModelsKey,
  institutionModelsKey,
  peekModels,
  fetchCustomModels,
  fetchInstitutionModels,
  clearModelCache,
  subscribe,
  scopeToUser,
} from '../../../app/javascript/src/utilities/llmModelCache';

describe('llmModelCache', () => {
  const originalCustom = UsersFetcher.fetchLlmModelsForConfig;
  const originalInstitution = UsersFetcher.fetchInstitutionLlmModels;

  let customCalls;
  let institutionCalls;
  let customResponse;

  beforeEach(() => {
    clearModelCache();
    customCalls = [];
    institutionCalls = [];
    customResponse = ['gpt-4o', 'gpt-4o-mini'];
    UsersFetcher.fetchLlmModelsForConfig = (config) => {
      customCalls.push(config);
      return Promise.resolve(customResponse);
    };
    UsersFetcher.fetchInstitutionLlmModels = (opts) => {
      institutionCalls.push(opts);
      return Promise.resolve(['kit.qwen3.5-397b-A17b']);
    };
  });

  after(() => {
    UsersFetcher.fetchLlmModelsForConfig = originalCustom;
    UsersFetcher.fetchInstitutionLlmModels = originalInstitution;
    clearModelCache();
  });

  describe('customModelsKey', () => {
    it('ignores whitespace and a trailing slash on the endpoint', () => {
      expect(customModelsKey({ protocol: 'openai', baseUrl: ' https://x/api/ ' }))
        .toEqual(customModelsKey({ protocol: 'openai', baseUrl: 'https://x/api' }));
    });

    it('separates providers by protocol', () => {
      expect(customModelsKey({ protocol: 'openai', baseUrl: '' }))
        .not.toEqual(customModelsKey({ protocol: 'anthropic', baseUrl: '' }));
    });

    it('ignores the api key, which is not part of a provider identity', () => {
      expect(customModelsKey({ protocol: 'openai', baseUrl: 'https://x', apiKey: 'a' }))
        .toEqual(customModelsKey({ protocol: 'openai', baseUrl: 'https://x', apiKey: 'b' }));
    });
  });

  describe('fetchCustomModels', () => {
    const config = { protocol: 'openai', baseUrl: 'https://x/api', model: 'gpt-4o' };

    it('resolves to the provider model list', async () => {
      expect(await fetchCustomModels(config)).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('serves a repeat lookup from the cache without a second request', async () => {
      await fetchCustomModels(config);
      const second = await fetchCustomModels(config);

      expect(customCalls.length).toEqual(1);
      expect(second).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('shares one request between concurrent lookups', async () => {
      const results = await Promise.all([
        fetchCustomModels(config),
        fetchCustomModels(config),
        fetchCustomModels(config),
      ]);

      expect(customCalls.length).toEqual(1);
      expect(results[2]).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('refetches when forced', async () => {
      await fetchCustomModels(config);
      await fetchCustomModels(config, { force: true });

      expect(customCalls.length).toEqual(2);
    });

    it('does not cache an empty answer as the list for that provider', async () => {
      customResponse = [];
      await fetchCustomModels(config);

      expect(peekModels(customModelsKey(config))).toEqual(null);
    });

    it('does not re-request straight away after an empty answer', async () => {
      customResponse = [];
      await fetchCustomModels(config);
      await fetchCustomModels(config);

      expect(customCalls.length).toEqual(1);
    });

    it('keeps a known list when a later lookup comes back empty', async () => {
      await fetchCustomModels(config);
      customResponse = [];
      await fetchCustomModels(config, { force: true });

      expect(peekModels(customModelsKey(config))).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });
  });

  describe('switching between providers', () => {
    const openai = { protocol: 'openai', baseUrl: 'https://x/api' };
    const claude = { protocol: 'anthropic', baseUrl: '' };

    it('keeps each provider list, so switching back needs no request', async () => {
      await fetchCustomModels(openai);
      customResponse = ['claude-opus-5'];
      await fetchCustomModels(claude);

      // Back to the first provider: its list is still there…
      expect(peekModels(customModelsKey(openai))).toEqual(['gpt-4o', 'gpt-4o-mini']);
      // …and the second provider's list has not been overwritten either.
      expect(peekModels(customModelsKey(claude))).toEqual(['claude-opus-5']);

      await fetchCustomModels(openai);
      expect(customCalls.length).toEqual(2); // one per provider, none for the switch back
    });

    it('keeps the institution list separate from any custom provider', async () => {
      await fetchInstitutionModels();
      await fetchCustomModels(openai);

      expect(peekModels(institutionModelsKey())).toEqual(['kit.qwen3.5-397b-A17b']);
      expect(peekModels(customModelsKey(openai))).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('fetches the institution list once per session', async () => {
      await fetchInstitutionModels();
      await fetchInstitutionModels();

      expect(institutionCalls.length).toEqual(1);
    });
  });

  describe('peekModels', () => {
    it('returns null for a provider that was never looked up', () => {
      expect(peekModels(customModelsKey({ protocol: 'gemini', baseUrl: '' }))).toEqual(null);
    });
  });

  describe('asking the server to refresh', () => {
    const config = { protocol: 'openai', baseUrl: 'https://x/api' };

    it('does not ask the server to re-read the catalogue on an ordinary lookup', async () => {
      await fetchCustomModels(config);
      await fetchInstitutionModels();

      expect(customCalls[0].refresh).toEqual(false);
      expect(institutionCalls[0].refresh).toEqual(false);
    });

    it('asks the server to re-read the catalogue when forced', async () => {
      await fetchCustomModels(config, { force: true });
      await fetchInstitutionModels({ force: true });

      // Without this the server would keep serving its own 30-minute cache entry
      // for an unchanged provider identity, and "Test connection" could never
      // surface a catalogue that changed at the provider.
      expect(customCalls[0].refresh).toEqual(true);
      expect(institutionCalls[0].refresh).toEqual(true);
    });

    it('forwards the config alongside the refresh flag', async () => {
      await fetchCustomModels({ ...config, model: 'gpt-4o', apiKey: 'sk-x' }, { force: true });

      expect(customCalls[0]).toEqual({
        protocol: 'openai', baseUrl: 'https://x/api', model: 'gpt-4o', apiKey: 'sk-x', refresh: true,
      });
    });
  });

  describe('a superseded lookup', () => {
    const config = { protocol: 'openai', baseUrl: 'https://x/api' };

    it('cannot overwrite the list a later forced lookup stored', async () => {
      // First lookup: slow, and answers with the list the provider used to offer.
      let releaseSlow;
      UsersFetcher.fetchLlmModelsForConfig = () => new Promise((resolve) => {
        releaseSlow = () => resolve(['stale-model']);
      });
      const slow = fetchCustomModels(config);

      // Test connection meanwhile: forced, fast, and authoritative.
      UsersFetcher.fetchLlmModelsForConfig = () => Promise.resolve(['fresh-model']);
      await fetchCustomModels(config, { force: true });
      expect(peekModels(customModelsKey(config))).toEqual(['fresh-model']);

      // The slow answer lands last but is no longer the owner of this entry.
      releaseSlow();
      await slow;

      expect(peekModels(customModelsKey(config))).toEqual(['fresh-model']);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners when a list is stored, and stops after unsubscribing', async () => {
      let notifications = 0;
      const unsubscribe = subscribe(() => { notifications += 1; });

      await fetchCustomModels({ protocol: 'openai', baseUrl: 'https://x/api' });
      expect(notifications).toEqual(1);

      unsubscribe();
      await fetchInstitutionModels();
      expect(notifications).toEqual(1);
    });

    it('does not notify when the answer was empty and nothing was stored', async () => {
      let notifications = 0;
      const unsubscribe = subscribe(() => { notifications += 1; });
      customResponse = [];

      await fetchCustomModels({ protocol: 'openai', baseUrl: 'https://x/api' });

      expect(notifications).toEqual(0);
      unsubscribe();
    });
  });

  describe('scopeToUser', () => {
    const config = { protocol: 'openai', baseUrl: 'https://x/api' };

    it('drops another user’s cached lists', async () => {
      scopeToUser(1);
      await fetchCustomModels(config);
      expect(peekModels(customModelsKey(config))).toEqual(['gpt-4o', 'gpt-4o-mini']);

      scopeToUser(2);

      expect(peekModels(customModelsKey(config))).toEqual(null);
    });

    it('keeps the cache for the same user', async () => {
      scopeToUser(1);
      await fetchCustomModels(config);
      scopeToUser(1);

      expect(peekModels(customModelsKey(config))).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('keeps the cache when the user is not known yet', async () => {
      scopeToUser(1);
      await fetchCustomModels(config);
      scopeToUser(undefined);
      scopeToUser(null);

      expect(peekModels(customModelsKey(config))).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });
  });
});
