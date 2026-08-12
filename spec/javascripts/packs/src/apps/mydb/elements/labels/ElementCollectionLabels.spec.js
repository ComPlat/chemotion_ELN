import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
// RootStore must be required BEFORE the component under test. This is the first spec to mount a
// component that transitively imports `src/utilities/routesUtils`, and the reverse order trips a
// pre-existing circular-import bug ("Super expression must either be null or a function" thrown
// from src/models/Component.js). CollectionsStore.spec.js already relies on the same ordering.
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import UserStore from 'src/stores/alt/stores/UserStore';

Enzyme.configure({ adapter: new Adapter() });

// A plain-object stand-in for the mobx CollectionsStore: the component only ever calls these
// three, and building a real RootStore would drag the fetchers in for no added coverage.
// `repository: true` marks a collection in the viewer's own repository subtree (the repository
// root and its "transferred" child). The store keeps that subtree on its own field for the
// sidebar, but `isOwnCollection` counts it as own — ownership is `user_id == current_user.id`,
// see the `.ownCollectionIds` cases in CollectionsStore.spec.js.
const storeFor = (collections) => ({
  collections: {
    find: (id) => collections.find((c) => c.id === id) || null,
    isOwnCollection: (id) => collections.some((c) => c.id === id && (c.own || c.repository)),
    isSharedCollection: (id) => collections.some((c) => c.id === id && c.sharedWithMe),
  },
});

const elementWith = (ids) => ({
  id: 42,
  type: 'sample',
  tag: { taggable_data: { collection_labels: ids.map((id) => (id == null ? id : { id })) } },
});

// The dropdown menu is portalled into document.body, and the whole mocha run shares one jsdom, so
// every mount has to be torn down or the menus of earlier cases stay attached for later specs.
const mounted = [];

const render = (collections, element) => {
  const wrapper = mount(
    <StoreContext.Provider value={storeFor(collections)}>
      <ElementCollectionLabels element={element} />
    </StoreContext.Provider>
  );
  mounted.push(wrapper);
  return wrapper;
};

describe('ElementCollectionLabels', () => {
  let userStub;

  beforeEach(() => {
    userStub = sinon.stub(UserStore, 'getState').returns({ currentUser: { id: 1 } });
  });

  afterEach(() => {
    while (mounted.length > 0) mounted.pop().unmount();
    userStub.restore();
  });

  describe('guards', () => {
    it('renders nothing without a signed-in user', () => {
      userStub.returns({ currentUser: null });

      const wrapper = render([{ id: 1, label: 'A', own: true }], elementWith([1]));

      expect(wrapper.find('button')).toHaveLength(0);
    });

    it('renders nothing when no label resolves to an own or shared collection', () => {
      // The one id present belongs to a collection in neither tree - nothing to show, and
      // notably no bare warning either (the "unreachable" signal is only for owners).
      const wrapper = render([{ id: 9, label: 'Foreign' }], elementWith([9]));

      expect(wrapper.find('button')).toHaveLength(0);
    });

    it('ignores malformed label entries instead of throwing on them', () => {
      const element = {
        id: 42,
        type: 'sample',
        tag: { taggable_data: { collection_labels: [null, {}, { id: 1 }] } },
      };

      const wrapper = render([{ id: 1, label: 'A', own: true }], element);

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('1');
    });
  });

  describe('the badge chips', () => {
    it('shows only the own-count chip, with no sub-count, when nothing is shared out', () => {
      const wrapper = render(
        [{ id: 1, label: 'A', own: true, shared: false }, { id: 2, label: 'B', own: true, shared: false }],
        elementWith([1, 2])
      );

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('2');
      expect(wrapper.find('.collection-labels-shared')).toHaveLength(0);
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
    });

    it('appends the shared-out sub-count when some own collections are shared out', () => {
      const wrapper = render(
        [{ id: 1, label: 'A', own: true, shared: true }, { id: 2, label: 'B', own: true, shared: false }],
        elementWith([1, 2])
      );

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('2 [1]');
    });

    it('shows only the shared-with-me chip when the viewer owns none of them', () => {
      const wrapper = render(
        [{ id: 5, label: 'Theirs', sharedWithMe: true, owner_name: 'Ada L' }],
        elementWith([5])
      );

      expect(wrapper.find('.collection-labels-own')).toHaveLength(0);
      expect(wrapper.find('.collection-labels-shared').first().text().trim()).toEqual('1');
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
    });

    it('warns, with the reachable wording, when the element is both owned and shared to the viewer', () => {
      const wrapper = render(
        [{ id: 1, label: 'Mine', own: true }, { id: 5, label: 'Theirs', sharedWithMe: true, owner_name: 'Ada L' }],
        elementWith([1, 5])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
      expect(wrapper.find('button').first().prop('title')).toEqual('Also shared with you elsewhere');
    });

    it('counts the viewer\'s own repository subtree as own, with no warning', () => {
      // "transferred" lives under the repository root, which the store keeps off own_collections.
      // It is still the viewer's own collection and is reachable from their sidebar, so it must
      // not read as "a collection you can't access".
      const wrapper = render(
        [
          { id: 1, label: 'Mine', own: true },
          { id: 2, label: 'chemotion-repository.net', repository: true },
          { id: 3, label: 'transferred', repository: true },
        ],
        elementWith([1, 3])
      );

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('2');
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
      expect(wrapper.find('button').first().prop('title')).toEqual(undefined);
    });

    it('still warns about someone else\'s repository subtree, which this store cannot resolve', () => {
      const wrapper = render(
        [{ id: 1, label: 'Mine', own: true }, { id: 9, label: 'transferred' }],
        elementWith([1, 9])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
      expect(wrapper.find('button').first().prop('title'))
        .toEqual("Also present in a collection you can't access");
    });

    it('warns, with the unreachable wording, when an owner\'s element sits in a collection they cannot resolve', () => {
      const wrapper = render(
        [{ id: 1, label: 'Mine', own: true }, { id: 9, label: 'Foreign' }],
        elementWith([1, 9])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
      expect(wrapper.find('button').first().prop('title'))
        .toEqual("Also present in a collection you can't access");
    });
    // Both causes can be live at once: one collection of the other user's is shared back, another
    // is not. The two are computed independently and both messages surface - an if/else here would
    // silently drop the "can't access" half, which is the one the viewer cannot find out any other
    // way.
    it('shows both warning messages when both causes apply at once', () => {
      const wrapper = render(
        [
          { id: 1, label: 'Sylvie Import', own: true },
          {
            id: 2, label: 'My project with Steven Su', sharedWithMe: true, owner_name: 'Sylvia V', permission_level: 5,
          },
          { id: 3, label: 'Addition' },
        ],
        elementWith([1, 2, 3])
      );

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('1');
      expect(wrapper.find('.collection-labels-shared').first().text().trim()).toEqual('1');
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
      expect(wrapper.find('button').first().prop('title'))
        .toEqual("Also shared with you elsewhere · Also present in a collection you can't access");
    });
  });

  describe('the popover', () => {
    const open = (wrapper) => {
      wrapper.find('button').first().simulate('click');
      wrapper.update();
      return wrapper;
    };

    it('groups the shared collections by their owner', () => {
      const wrapper = open(render(
        [
          { id: 1, label: 'Mine', own: true },
          {
            id: 5, label: 'From Ada', sharedWithMe: true, owner_name: 'Ada L', permission_level: 0,
          },
          {
            id: 6, label: 'Also from Ada', sharedWithMe: true, owner_name: 'Ada L', permission_level: 0,
          },
          {
            id: 7, label: 'From Grace', sharedWithMe: true, owner_name: 'Grace H', permission_level: 0,
          },
        ],
        elementWith([1, 5, 6, 7])
      ));

      const text = wrapper.find('.dropdown-menu').first().text();
      expect(text).toContain('My Collections');
      expect(text).toContain('Shared Collections');
      // One heading per owner, not one per collection.
      expect(text.match(/Ada L/g)).toHaveLength(1);
      expect(text.match(/Grace H/g)).toHaveLength(1);
      expect(text).toContain('From Ada');
      expect(text).toContain('Also from Ada');
      expect(text).toContain('From Grace');
    });

    // Two people can carry the same plain name, so grouping on `owner_name` would fold them into a
    // single heading (and reuse one React key). `owner` carries the unique abbreviation, which is
    // exactly why the store groups the shared tree on it - the plain name is only the label.
    it('keeps two same-named owners apart, labelling both with the plain name', () => {
      const wrapper = open(render(
        [
          {
            id: 5, label: 'From the first Jan', sharedWithMe: true, owner: 'Jan Meyer (JM1)', owner_name: 'Jan Meyer',
          },
          {
            id: 6, label: 'From the second Jan', sharedWithMe: true, owner: 'Jan Meyer (JM2)', owner_name: 'Jan Meyer',
          },
        ],
        elementWith([5, 6])
      ));

      const text = wrapper.find('.dropdown-menu').first().text();
      expect(text.match(/Jan Meyer/g)).toHaveLength(2);
      expect(text).toContain('From the first Jan');
      expect(text).toContain('From the second Jan');
      expect(text).not.toContain('(JM1)');
    });

    it('marks a group-mediated share without naming the group', () => {
      const wrapper = open(render(
        [{
          id: 5, label: 'From Ada', sharedWithMe: true, owner_name: 'Ada L', shared_via_group: true,
        }],
        elementWith([5])
      ));

      expect(wrapper.find('.dropdown-menu').first().text()).toContain('(via group)');
    });

    it('lists both warning messages as separate lines when both apply', () => {
      const wrapper = open(render(
        [
          { id: 1, label: 'Sylvie Import', own: true },
          { id: 2, label: 'Theirs, shared', sharedWithMe: true, owner_name: 'Sylvia V' },
          { id: 3, label: 'Theirs, not shared' },
        ],
        elementWith([1, 2, 3])
      ));

      const text = wrapper.find('.dropdown-menu').first().text();
      expect(text).toContain('Also shared with you elsewhere');
      expect(text).toContain("Also present in a collection you can't access");
    });

    it('spells out the dual-ownership warning as persistent text', () => {
      const wrapper = open(render(
        [{ id: 1, label: 'Mine', own: true }, { id: 9, label: 'Foreign' }],
        elementWith([1, 9])
      ));

      expect(wrapper.find('.dropdown-menu').first().text())
        .toContain("Also present in a collection you can't access");
    });
  });
});
