import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { act } from 'react-dom/test-utils';
import expect from 'expect';
import sinon from 'sinon';
import LlmProviderAccess from 'src/components/llm/LlmProviderAccess';
import AdminFetcher from 'src/fetchers/AdminFetcher';

configure({ adapter: new Adapter() });

describe('LlmProviderAccess model list', () => {
  // One provider opens straight away; its whole-provider rule renders the model select.
  const provider = {
    id: 3,
    name: 'KIT',
    api_protocol: 'openai',
    base_url: 'https://api.openai.com/v1',
    api_key_masked: 'sk-...abcd',
    restrict_models: false,
    grants: [{
      model: null, enabled: true, include_users: [], exclude_users: [],
    }],
  };
  let fetchModels;
  let wrapper;

  const settle = async () => {
    await act(() => new Promise((resolve) => { setTimeout(resolve, 0); }));
    wrapper.update();
  };
  const listedModels = () => wrapper.find('option').map((o) => o.prop('value')).filter((v) => v !== '*');
  const reloadButton = () => wrapper.find('button').filterWhere((b) => b.text().includes('Reload models'));

  beforeEach(async () => {
    fetchModels = sinon.stub(AdminFetcher, 'fetchInstitutionLlmModels').resolves(['gpt-4o']);
    wrapper = mount(<LlmProviderAccess providers={[provider]} onChanged={sinon.spy()} />);
    await settle();
  });

  afterEach(() => {
    wrapper.unmount();
    sinon.restore();
  });

  it('lists the models the provider offers', () => {
    expect(listedModels()).toEqual(['gpt-4o']);
  });

  [
    ['base_url', 'https://llm.example.org/v1'],
    ['api_protocol', 'anthropic'],
    ['api_key_masked', 'sk-...wxyz'],
  ].forEach(([field, value]) => {
    it(`reads the list again once the ${field} changes`, async () => {
      fetchModels.resolves(['llama-3']);

      wrapper.setProps({ providers: [{ ...provider, [field]: value }] });
      await settle();

      expect(fetchModels.callCount).toEqual(2);
      expect(listedModels()).toEqual(['llama-3']);
    });
  });

  it('offers no reload while the provider lists models', () => {
    expect(reloadButton().exists()).toBe(false);
  });

  it('lets the admin ask an empty provider again, past the server cache', async () => {
    fetchModels.resolves([]);
    wrapper.setProps({ providers: [{ ...provider, base_url: 'https://down.example.org/v1' }] });
    await settle();
    expect(listedModels()).toEqual([]);

    fetchModels.resolves(['gpt-4o']);
    reloadButton().simulate('click');
    await settle();

    expect(fetchModels.lastCall.args).toEqual([3, { refresh: true }]);
    expect(listedModels()).toEqual(['gpt-4o']);
    expect(reloadButton().exists()).toBe(false);
  });
});
