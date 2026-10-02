import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import { OverlayTrigger } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
// RootStore must be required BEFORE the component under test. This is the first spec to mount a
// component that transitively imports `src/utilities/routesUtils`, and the reverse order trips a
// pre-existing circular-import bug ("Super expression must either be null or a function" thrown
// from src/models/Component.js). CollectionsStore.spec.js already relies on the same ordering.
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';

Enzyme.configure({ adapter: new Adapter() });

// A plain-object stand-in for the mobx CollectionsStore: the component only ever calls these
// three, and building a real RootStore would drag the fetchers in for no added coverage.
// `repository: true` marks a collection in the viewer's own repository subtree (the repository
// root and its "transferred" child). The store keeps that subtree on its own field for the
// sidebar, but `isOwnCollection` counts it as own — ownership is `user_id == current_user.id`,
// see the `.ownCollectionIds` cases in CollectionsStore.spec.js.
// The share fetchers are spied, never stubbed with data: the point of the tooltips is that they
// are not mounted until hovered, so these must stay uncalled through render and open.
const shareFetches = { own: sinon.spy(), sharedToMe: sinon.spy() };

const storeFor = (collections, currentUser = { id: 1 }) => ({
  collections: {
    find: (id) => collections.find((c) => c.id === id) || null,
    isOwnCollection: (id) => collections.some((c) => c.id === id && (c.own || c.repository)),
    isSharedCollection: (id) => collections.some((c) => c.id === id && c.sharedWithMe),
    sharedWithUsers: () => undefined,
    mySharesFor: () => undefined,
    getSharedWithUsers: shareFetches.own,
    getMySharesFor: shareFetches.sharedToMe,
  },
  // ElementCollectionLabels reads useContext(StoreContext).userStore.currentUser
  // (mobx-state-tree) directly - a plain object stand-in is enough, same as
  // `collections` above, no need for a real UserStore instance.
  userStore: { currentUser },
});

const elementWith = (ids) => ({
  id: 42,
  type: 'sample',
  tag: { taggable_data: { collection_labels: ids.map((id) => (id == null ? id : { id })) } },
});

// The dropdown menu is portalled into document.body, and the whole mocha run shares one jsdom, so
// every mount has to be torn down or the menus of earlier cases stay attached for later specs.
const mounted = [];

const render = (collections, element, currentUser = { id: 1 }) => {
  const wrapper = mount(
    <StoreContext.Provider value={storeFor(collections, currentUser)}>
      <ElementCollectionLabels element={element} />
    </StoreContext.Provider>
  );
  mounted.push(wrapper);
  return wrapper;
};

describe('ElementCollectionLabels', () => {
  beforeEach(() => {
    shareFetches.own.resetHistory();
    shareFetches.sharedToMe.resetHistory();
  });

  afterEach(() => {
    while (mounted.length > 0) mounted.pop().unmount();
  });

  describe('guards', () => {
    it('renders nothing without a signed-in user', () => {
      const wrapper = render([{ id: 1, label: 'A', own: true }], elementWith([1]), null);

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

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('2 1');
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

    // S3/user1. Co-presence in a collection the viewer can open is ordinary collaboration: the
    // shared chip already says so, and the popover explains the consequence. No triangle.
    it('does not warn when the other collection is one the viewer can open', () => {
      const wrapper = render(
        [{ id: 1, label: 'Mine', own: true }, { id: 5, label: 'Theirs', sharedWithMe: true, owner_name: 'Ada L' }],
        elementWith([1, 5])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
      expect(wrapper.find('button').first().prop('title')).toEqual(undefined);
    });

    // The triangle must stay bound to the unreachable case alone; a refactor that re-attached it
    // to "has any message" would silently resurrect the benign warning.
    it('keeps the triangle off when only the reachable case applies', () => {
      const wrapper = render(
        [
          { id: 1, label: 'Mine', own: true },
          { id: 2, label: 'Also mine', own: true },
          { id: 5, label: 'Theirs', sharedWithMe: true, owner_name: 'Ada L' },
        ],
        elementWith([1, 2, 5])
      );

      expect(wrapper.find('.collection-labels-own').first().text().trim()).toEqual('2');
      expect(wrapper.find('.collection-labels-shared').first().text().trim()).toEqual('1');
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
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
    // Ownership wins over the share. This viewer holds the element in a collection of their own
    // (id 1) as well as through someone else's share (id 2); id 3 is a collection they cannot
    // resolve. Owning any of it is enough to be told - how they first came across the element
    // does not enter into it.
    it('warns a viewer who owns a collection for it, even though a share also reaches them', () => {
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
        .toEqual("Also present in a collection you can't access");
    });

    // The only suppression there is: own nothing here and the element is simply not yours to be
    // told about.
    it('stays silent for a sharee who owns none of the collections', () => {
      const wrapper = render(
        [
          { id: 1, label: 'Shared to me', sharedWithMe: true, owner_name: 'Ada L' },
          { id: 2, label: 'The owner\'s other collection' },
        ],
        elementWith([1, 2])
      );

      expect(wrapper.find('.collection-labels-own')).toHaveLength(0);
      expect(wrapper.find('.collection-labels-shared').first().text().trim()).toEqual('1');
      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(0);
    });

    // The case this rule exists for: a colleague's share (id 5) has nothing to do with the third
    // party holding id 9, and must not mask it. An earlier version let any share suppress the
    // warning, which hid exactly this - the one thing the owner cannot find out another way.
    it('does not let an unrelated share mask a third party holding the element', () => {
      const wrapper = render(
        [
          { id: 1, label: 'Mine', own: true },
          { id: 5, label: 'Unrelated shared', sharedWithMe: true, owner_name: 'Ada L' },
          { id: 9, label: 'Hidden third party' },
        ],
        elementWith([1, 5, 9])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
    });

    // ...and equally when the hidden collection belongs to the very person who shared to them.
    // Whose it is deliberately does not enter the rule; that it is not the viewer's does.
    it('warns even when the hidden collection belongs to the sharer themselves', () => {
      const wrapper = render(
        [
          { id: 1, label: 'Mine', own: true },
          {
            id: 5, label: 'Shared by Ada', sharedWithMe: true, owner: 'Ada L (AL)', owner_name: 'Ada L',
          },
          { id: 9, label: "Ada's other collection" },
        ],
        elementWith([1, 5, 9])
      );

      expect(wrapper.find('.collection-labels-dual-owned')).toHaveLength(1);
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
      expect(text).toContain('Shared with me by');
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

    it('sorts the owner groups alphabetically, and each owner\'s collections by label', () => {
      const wrapper = open(render(
        [
          { id: 5, label: 'Zulu', sharedWithMe: true, owner: 'Zoe A (ZA)', owner_name: 'Zoe A' },
          { id: 6, label: 'Bravo', sharedWithMe: true, owner: 'Ada L (AL)', owner_name: 'Ada L' },
          { id: 7, label: 'Alpha', sharedWithMe: true, owner: 'Ada L (AL)', owner_name: 'Ada L' },
        ],
        elementWith([5, 6, 7])
      ));

      const text = wrapper.find('.dropdown-menu').first().text();
      // Ada before Zoe even though Zoe's collection came first in the tag; Alpha before Bravo
      // even though Bravo came first.
      expect(text.indexOf('Ada L')).toBeLessThan(text.indexOf('Zoe A'));
      expect(text.indexOf('Alpha')).toBeLessThan(text.indexOf('Bravo'));
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

    it('offers the sidebar\'s share tooltip on an own collection that is shared out', () => {
      const wrapper = open(render(
        [{ id: 1, label: 'Mine', own: true, shared: true }],
        elementWith([1])
      ));

      expect(wrapper.find('.dropdown-menu').first().find(OverlayTrigger).length).toBeGreaterThan(0);
      expect(wrapper.find('.dropdown-menu').first().find('i.fa-share-alt')).toHaveLength(1);
    });

    // The property that makes a tooltip per row affordable at 15-60 badges a page: the overlay is
    // not mounted until it is hovered, so nothing fetches on render or on open. If someone adds
    // renderOnMount to the menu, or hoists the fetch out of the tooltip, this fails.
    it('fetches no share information until a tooltip is actually hovered', () => {
      open(render(
        [
          { id: 1, label: 'Mine', own: true, shared: true },
          {
            id: 5, label: 'Theirs', sharedWithMe: true, owner: 'Ada L (AL)', owner_name: 'Ada L',
          },
        ],
        elementWith([1, 5])
      ));

      expect(shareFetches.own.called).toBe(false);
      expect(shareFetches.sharedToMe.called).toBe(false);
    });

    it('states the reachable case as neutral text, never as a warning', () => {
      const wrapper = open(render(
        [
          { id: 1, label: 'Sylvie Import', own: true },
          { id: 2, label: 'Theirs, shared', sharedWithMe: true, owner_name: 'Sylvia V' },
        ],
        elementWith([1, 2])
      ));

      const menu = wrapper.find('.dropdown-menu').first();
      expect(menu.text()).toContain('Also shared with you elsewhere');
      expect(menu.text()).not.toContain("Also present in a collection you can't access");
      // neutral: no warning colour and no triangle anywhere in the menu
      expect(menu.find('.text-warning')).toHaveLength(0);
      expect(menu.find('.fa-exclamation-triangle')).toHaveLength(0);
    });

    it('spells the warning out as persistent text, in warning colour', () => {
      const wrapper = open(render(
        [{ id: 1, label: 'Mine', own: true }, { id: 9, label: 'Foreign' }],
        elementWith([1, 9])
      ));

      const menu = wrapper.find('.dropdown-menu').first();
      expect(menu.text()).toContain("Also present in a collection you can't access");
      expect(menu.find('.text-warning').length).toBeGreaterThan(0);
    });
  });
});
