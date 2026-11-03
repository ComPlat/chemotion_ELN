/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import InventoryFieldAccess, {
  initialFieldAccess
} from 'src/apps/mydb/elements/list/selectionActions/InventoryFieldAccess';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import InventoryIntegrationFetcher from 'src/fetchers/InventoryIntegrationFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';

Enzyme.configure({ adapter: new Adapter() });

const groups = [
  { key: 'substance_safety', levels: ['read', 'edit'] },
  { key: 'location', levels: ['hidden', 'read', 'edit'] },
];
const config = {
  inventory: true,
  groups,
  role_defaults: {
    reviewer: { substance_safety: 'read', location: 'read' },
    collaborator: { substance_safety: 'read', location: 'hidden' },
    partner: { substance_safety: 'read', location: 'edit' },
  },
  default_roles: { 0: 'reviewer', 1: 'partner' },
  own_access: { substance_safety: 'edit', location: 'read' },
};
const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('InventoryFieldAccess', () => {
  it('starts from the share map, else the default of its permission level', () => {
    expect(initialFieldAccess(config, 1, null)).toEqual(config.role_defaults.partner);
    expect(initialFieldAccess(config, 0, { location: 'hidden' })).toEqual({ location: 'hidden' });
  });

  it('reports a changed level and disables levels above the editor\'s own', () => {
    const onChange = sinon.spy();
    const wrapper = mount(
      <InventoryFieldAccess
        groups={groups}
        access={{ substance_safety: 'read', location: 'read' }}
        ownAccess={config.own_access}
        onChange={onChange}
      />
    );
    const location = wrapper.find('select').at(1);
    expect(location.find('option[value="edit"]').prop('disabled')).toBe(true);
    expect(wrapper.find('select').at(0).find('option').map((option) => option.prop('value'))).toEqual(['read', 'edit']);

    location.simulate('change', { target: { value: 'hidden' } });
    expect(onChange.calledWith({ substance_safety: 'read', location: 'hidden' })).toBe(true);
  });
});

describe('SelectionShareModal on an inventory collection', () => {
  let fetchStub;

  afterEach(() => fetchStub.restore());

  const mountModal = (collections, permissions = {}) => mount(
    <StoreContext.Provider value={{ collections }}>
      <SelectionShareModal
        collectionId={5}
        collectionShareId={9}
        shareType="edit"
        showUserSelect={false}
        collectionPermissions={{ permissionLevel: 1, sampleDetailLevel: 10, ...permissions }}
        onHide={() => {}}
      />
    </StoreContext.Provider>
  );

  it('sends the field access, starting from the role default and following role shortcuts', async () => {
    fetchStub = sinon.stub(InventoryIntegrationFetcher, 'fetchFieldAccess').resolves(config);
    const collections = { updateCollectionShare: sinon.spy() };
    const wrapper = mountModal(collections);
    await flush();
    wrapper.update();
    expect(wrapper.find(InventoryFieldAccess).prop('access')).toEqual(config.role_defaults.partner);

    wrapper.find('select#shortcutSelect').simulate('change', { target: { value: 'collaborator' } });
    wrapper.find('button').filterWhere((button) => button.text() === 'Edit Permissions').simulate('click');
    const [shareId, params] = collections.updateCollectionShare.firstCall.args;
    expect(shareId).toBe(9);
    expect(params.inventory_field_access).toEqual(config.role_defaults.collaborator);
  });

  it('leaves ordinary collections without field access', async () => {
    fetchStub = sinon.stub(InventoryIntegrationFetcher, 'fetchFieldAccess').resolves({ inventory: false });
    const collections = { updateCollectionShare: sinon.spy() };
    const wrapper = mountModal(collections);
    await flush();
    wrapper.update();
    expect(wrapper.find(InventoryFieldAccess).exists()).toBe(false);
    wrapper.find('button').filterWhere((button) => button.text() === 'Edit Permissions').simulate('click');
    expect(collections.updateCollectionShare.firstCall.args[1]).not.toHaveProperty('inventory_field_access');
  });
});
