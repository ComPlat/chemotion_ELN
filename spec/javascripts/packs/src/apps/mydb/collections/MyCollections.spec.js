import React from 'react';
import expect from 'expect';
import Enzyme, { mount, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { Button, Dropdown, Form } from 'react-bootstrap';
import { act } from 'react-dom/test-utils';
import MyCollections from 'src/apps/mydb/collections/MyCollections';
import AppModal from 'src/components/common/AppModal';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { rootStore } from 'src/stores/mobx/RootStore';

Enzyme.configure({ adapter: new Adapter() });

// The three system collections are owned but locked: the API refuses to rename, reparent or delete
// them, and refuses to create anything inside them. They are listed here so their shares and tab
// layout stay reachable, which means the row must not offer any affordance that would fail.
const collection = (attributes) => ({
  ancestry: '/', position: null, is_locked: false, shared: false, ...attributes,
});

const allCollection = collection({ id: 9, label: 'All', position: 0, is_locked: true });
const repositoryRoot = collection({
  id: 1, label: 'chemotion-repository.net', position: 1, is_locked: true, shared: true,
});
const transferred = collection({
  id: 3, label: 'transferred', ancestry: '/1/', is_locked: true,
});
const ordinary = collection({ id: 4, label: 'Project' });

// MyCollections resolves its store through useContext(StoreContext), whose default value is the
// module-level rootStore — the shallow renderer walks neither a provider nor a stubbed hook, so the
// real store is seeded instead.
const seedStore = (collections) => {
  const store = rootStore.collections;
  // setOwnCollections appends; the store is a module-level singleton shared by every example here,
  // so the trees are reset through a snapshot (own_collections.clear() is action-protected).
  applySnapshot(store, {
    ...getSnapshot(store), own_collections: [], locked_collection: [], chemotion_repository_collection: null,
  });
  store.setOwnCollections(collections);
  store.setOwnCollectionTree();
};

// Every rendered observer — shallow ones included — stays subscribed to the store, so each has to
// be unmounted before the next example re-seeds it; otherwise it re-renders against nodes
// applySnapshot has already killed.
let rendered = [];

const track = (wrapper) => {
  rendered.push(wrapper);
  return wrapper;
};

const renderWith = (collections) => {
  seedStore(collections);
  return track(shallow(<MyCollections />));
};

// The confirm dialog is hook state, and the shallow renderer does not flush a hook update; these
// two examples mount so the re-render actually happens.
const mountWith = (collections) => {
  seedStore(collections);
  return track(mount(<MyCollections />));
};

const systemSection = (wrapper) => wrapper.find('.system-collections');
const allCollections = [allCollection, repositoryRoot, transferred, ordinary];

describe('MyCollections system collections section', () => {
  afterEach(() => {
    rendered.forEach((wrapper) => wrapper.unmount());
    rendered = [];
  });

  it('lists the three system collections above the editable tree', () => {
    const section = systemSection(renderWith(allCollections));

    expect(section).toHaveLength(1);
    expect(section.text()).toContain('System collections');
  });

  it('renders each system collection label as text, never as a rename input', () => {
    const section = systemSection(renderWith(allCollections));

    expect(section.find(Form.Control)).toHaveLength(0);
    ['All', 'chemotion-repository.net', 'transferred'].forEach((label) => {
      expect(section.text()).toContain(label);
    });
  });

  it('offers no add-sub-collection or delete button on a system collection', () => {
    const section = systemSection(renderWith(allCollections));

    expect(section.find(Button)).toHaveLength(0);
  });

  it('offers share and tab actions, and manage-shares only where the collection is shared', () => {
    const section = systemSection(renderWith(allCollections));
    const itemTexts = section.find(Dropdown.Item).map((n) => n.text().replace(/\s+/g, ' ').trim());

    expect(itemTexts.filter((t) => t === 'Add share')).toHaveLength(3);
    expect(itemTexts.filter((t) => t === 'Edit collection tabs')).toHaveLength(3);
    expect(itemTexts.filter((t) => t === 'Manage shares')).toHaveLength(1);
  });

  it('renders nothing when the user has no system collections', () => {
    const wrapper = renderWith([ordinary]);

    expect(systemSection(wrapper)).toHaveLength(0);
  });

  // "All" holds every element the user owns, so sharing it is confirmed before the share modal
  // opens; the other two share straight away.
  it('confirms before sharing "All"', () => {
    const wrapper = mountWith(allCollections);
    const allShareItem = systemSection(wrapper).find(Dropdown.Item).at(0);

    act(() => { allShareItem.props().onClick(); });
    wrapper.update();

    expect(wrapper.find(AppModal)).toHaveLength(1);
    expect(wrapper.find(AppModal).prop('title')).toBe('Share "All"?');
  });

  it('does not confirm before sharing the repository collection', () => {
    const wrapper = mountWith(allCollections);
    // Rows: All (share, tabs), repository (share, manage, tabs), transferred (share, tabs).
    const repositoryShareItem = systemSection(wrapper).find(Dropdown.Item).at(2);

    act(() => { repositoryShareItem.props().onClick(); });
    wrapper.update();

    // The share modal opens straight away — matched on title, since the share modal is an AppModal
    // too, so a bare component count cannot tell the confirm dialog from the share dialog.
    const titles = wrapper.find(AppModal).map((n) => n.prop('title'));
    expect(titles).not.toContain('Share "chemotion-repository.net"?');
  });
});
