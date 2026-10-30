/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import SettingsForm from 'src/apps/admin/inventoryIntegration/SettingsForm';

Enzyme.configure({ adapter: new Adapter() });

const schema = {
  type: 'object',
  required: ['scope'],
  properties: {
    scope: { type: 'string', title: 'Scope' },
    page_size: { type: 'integer' },
    api_key: { type: 'string', 'x-secret': true },
  },
};

describe('SettingsForm', () => {
  const render = (props) => mount(
    <SettingsForm schema={schema} settings={{ scope: 'lab' }} credentials={{}} onChange={() => {}} {...props} />
  );

  it('renders secrets as empty password fields, never showing a stored one', () => {
    const wrapper = render({ credentialsSet: true });
    const secret = wrapper.find('input#setting-api_key');
    expect(secret.prop('type')).toBe('password');
    expect(secret.prop('value')).toBe('');
    expect(secret.prop('placeholder')).toBe('Stored; leave empty to keep');
  });

  it('keeps secrets in the credentials and types numbers', () => {
    const onChange = sinon.spy();
    const wrapper = render({ onChange });
    wrapper.find('input#setting-api_key').simulate('change', { target: { value: 'k3y' } });
    expect(onChange.lastCall.args[0]).toEqual({ settings: { scope: 'lab' }, credentials: { api_key: 'k3y' } });
    wrapper.find('input#setting-page_size').simulate('change', { target: { value: '50' } });
    expect(onChange.lastCall.args[0].settings).toEqual({ scope: 'lab', page_size: 50 });
  });

  it('leaves out secret fields when IT supplies the credentials', () => {
    expect(render({ secretsFromIt: true }).find('input#setting-api_key').exists()).toBe(false);
  });
});
