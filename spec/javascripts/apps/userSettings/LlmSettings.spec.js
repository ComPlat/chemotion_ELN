import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { act } from 'react-dom/test-utils';
import expect from 'expect';
import sinon from 'sinon';
import LlmSettings, { effectiveProviderChoice } from 'src/apps/userSettings/LlmSettings';
import LlmProviderList from 'src/components/llm/LlmProviderList';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { clearModelCache, peekModels, providerModelsKey } from 'src/utilities/llmModelCache';

configure({ adapter: new Adapter() });

describe('effectiveProviderChoice', () => {
  const gates = { personal: true, institutionOk: true };
  const own = [{ id: 7, enabled: true }, { id: 9, enabled: true }];

  it('keeps a saved default that is still one of the user\'s providers', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 9 }, own, gates))
      .toEqual({ type: 'custom', defaultProviderId: 9 });
  });

  it('falls back to the oldest provider when the saved default is gone', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: null }, own, gates))
      .toEqual({ type: 'custom', defaultProviderId: 7 });
  });

  it('skips a disabled provider', () => {
    const mixed = [{ id: 7, enabled: false }, { id: 9, enabled: true }];
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 7 }, mixed, gates))
      .toEqual({ type: 'custom', defaultProviderId: 9 });
  });

  it('shows the institution mode once the user has no provider left', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: null }, [], gates))
      .toEqual({ type: 'global', defaultProviderId: null });
  });

  it('stays on custom without providers when the institution is closed to the user', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom' }, [], { personal: true, institutionOk: false }))
      .toEqual({ type: 'custom', defaultProviderId: null });
  });

  it('leaves the institution mode when personal keys are off', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 7 }, own,
      { personal: false, institutionOk: true }).type).toEqual('global');
  });
});

describe('LlmSettings after a provider edit', () => {
  const settings = {
    setting: { provider_type: 'custom', default_llm_provider_id: 7 },
    providers: [{ id: 7, name: 'Mine', api_protocol: 'openai', base_url: 'https://api.openai.com/v1', enabled: true }],
    task_mappings: [],
    institution_providers: [],
    ai_user_api_key_allowed: true,
    ai_global_provider_allowed: false,
  };
  let models;
  let wrapper;

  const settle = () => act(() => new Promise((resolve) => { setTimeout(resolve, 0); }));
  const providerList = () => wrapper.find(LlmProviderList);

  beforeEach(async () => {
    clearModelCache();
    models = ['gpt-4o', 'gpt-4o-mini'];
    sinon.stub(UsersFetcher, 'fetchLlmSettings').callsFake(() => Promise.resolve(settings));
    sinon.stub(UsersFetcher, 'fetchLlmTasks').resolves([]);
    sinon.stub(UsersFetcher, 'fetchLlmProviderProfiles').resolves([]);
    sinon.stub(UsersFetcher, 'fetchLlmProviderModels').callsFake(() => Promise.resolve(models));
    sinon.stub(UsersFetcher, 'updateLlmProvider').resolves({});
    sinon.stub(UsersFetcher, 'deleteLlmProvider').resolves({});
    wrapper = mount(<LlmSettings userId={1} />);
    await settle();
    wrapper.update();
  });

  afterEach(() => {
    wrapper.unmount();
    sinon.restore();
    clearModelCache();
  });

  it('stops offering the old endpoint models once the edited provider lists none', async () => {
    expect(peekModels(providerModelsKey(7))).toEqual(['gpt-4o', 'gpt-4o-mini']);
    models = [];

    await act(() => providerList().prop('api').update(7, { base_url: 'https://llm.example.org/v1' }));
    await act(() => providerList().prop('onChanged')());
    await settle();

    expect(peekModels(providerModelsKey(7))).toEqual(null);
  });

  it('forgets the models of a deleted provider', async () => {
    await act(() => providerList().prop('api').remove(7));

    expect(peekModels(providerModelsKey(7))).toEqual(null);
  });

  it('keeps the list when the edit is refused', async () => {
    UsersFetcher.updateLlmProvider.rejects(new Error('base_url is not allowed'));

    await act(() => providerList().prop('api').update(7, { base_url: 'http://10.0.0.1' }).catch(() => {}));

    expect(peekModels(providerModelsKey(7))).toEqual(['gpt-4o', 'gpt-4o-mini']);
  });
});
