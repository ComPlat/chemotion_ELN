import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import CollectionSubtreeFunctions from 'src/apps/mydb/collections/CollectionSubtreeFunctions';
import { PermissionConst } from 'src/utilities/PermissionConst';

configure({ adapter: new Adapter() });

const ownCollection = { id: 1, label: 'Own', is_locked: false };
const lockedCollection = { id: 2, label: 'All', is_locked: true };
const sharedWithReadOnly = {
  id: 3, label: 'Read only', is_locked: false, permission_level: PermissionConst.ReadElements,
};
const sharedWithAddElements = {
  id: 4, label: 'Add elements', is_locked: false, permission_level: PermissionConst.AddElements,
};
const sharedWithManageShares = {
  id: 5, label: 'Manage shares', is_locked: false, permission_level: PermissionConst.ManageShares,
};

const itemTexts = (wrapper) => wrapper.find(Dropdown.Item).map((n) => n.text().replace(/\s+/g, ' ').trim());

describe('CollectionSubtreeFunctions permission gating', () => {
  it('own collection with onAddShare: shows every action', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={ownCollection}
        hasRadar
        onAddShare={() => {}}
      />
    );
    const texts = itemTexts(wrapper);
    expect(texts).toContain('Reference Report');
    expect(texts).toContain('Import samples to collection');
    expect(texts).toContain('Add share');
    expect(texts).toContain('Edit collection metadata');
    expect(texts).toContain('Publish via RADAR');
  });

  it('own collection without onAddShare: hides Add share', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions collection={ownCollection} hasRadar />
    );
    expect(itemTexts(wrapper)).not.toContain('Add share');
  });

  it('own shared collection with onManageShares callback: shows Manage shares', () => {
    const sharedOwn = { ...ownCollection, shared: true };
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={sharedOwn}
        hasRadar
        onAddShare={() => {}}
        onManageShares={() => {}}
      />
    );
    expect(itemTexts(wrapper)).toContain('Manage shares');
  });

  it('own shared collection without onManageShares: hides Manage shares', () => {
    const sharedOwn = { ...ownCollection, shared: true };
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={sharedOwn}
        hasRadar
        onAddShare={() => {}}
      />
    );
    expect(itemTexts(wrapper)).not.toContain('Manage shares');
  });

  it('locked collection (e.g. All): only Reference Report survives', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions collection={lockedCollection} hasRadar />
    );
    expect(itemTexts(wrapper)).toEqual(['Reference Report']);
  });

  it('shared-with-me at Read: only Reference Report', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={sharedWithReadOnly}
        sharedWithMe
        hasRadar
      />
    );
    expect(itemTexts(wrapper)).toEqual(['Reference Report']);
  });

  it('shared-with-me at AddElements: adds Import samples and metadata actions, no shares', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={sharedWithAddElements}
        sharedWithMe
        hasRadar
      />
    );
    const texts = itemTexts(wrapper);
    expect(texts).toContain('Reference Report');
    expect(texts).toContain('Import samples to collection');
    expect(texts).toContain('Edit collection metadata');
    expect(texts).toContain('Publish via RADAR');
    expect(texts).not.toContain('Add share');
    expect(texts).not.toContain('Manage shares');
  });

  it('shared-with-me at ManageShares: full menu including metadata & shares', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={sharedWithManageShares}
        sharedWithMe
        hasRadar
        onAddShare={() => {}}
        onManageShares={() => {}}
      />
    );
    const texts = itemTexts(wrapper);
    expect(texts).toContain('Import samples to collection');
    expect(texts).toContain('Add share');
    expect(texts).toContain('Manage shares');
    expect(texts).toContain('Edit collection metadata');
    expect(texts).toContain('Publish via RADAR');
  });

  it('publish RADAR: disabled when hasRadar is false', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions collection={ownCollection} hasRadar={false} onAddShare={() => {}} />
    );
    const publishItem = wrapper.find(Dropdown.Item)
      .filterWhere((n) => n.text().includes('Publish via RADAR'));
    expect(publishItem.prop('disabled')).toBe(true);
  });

  it('missing permission_level on shared collection: treated as no access', () => {
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={{ id: 6, label: 'No PL', is_locked: false }}
        sharedWithMe
        hasRadar
      />
    );
    expect(itemTexts(wrapper)).toEqual(['Reference Report']);
  });

  it('returns null for null collection', () => {
    const wrapper = shallow(<CollectionSubtreeFunctions collection={null} />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
});

describe('CollectionSubtreeFunctions callbacks', () => {
  it('invokes onAddShare when Add share clicked', () => {
    const onAddShare = sinon.spy();
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={ownCollection}
        hasRadar
        onAddShare={onAddShare}
      />
    );
    const addItem = wrapper.find(Dropdown.Item)
      .filterWhere((n) => n.text().includes('Add share'));
    addItem.simulate('click', { stopPropagation: () => {} });
    expect(onAddShare.calledOnce).toBe(true);
  });

  it('invokes onManageShares when Manage shares clicked', () => {
    const onManageShares = sinon.spy();
    const wrapper = shallow(
      <CollectionSubtreeFunctions
        collection={{ ...ownCollection, shared: true }}
        hasRadar
        onAddShare={() => {}}
        onManageShares={onManageShares}
      />
    );
    const manageItem = wrapper.find(Dropdown.Item)
      .filterWhere((n) => n.text().includes('Manage shares'));
    manageItem.simulate('click', { stopPropagation: () => {} });
    expect(onManageShares.calledOnce).toBe(true);
  });
});
