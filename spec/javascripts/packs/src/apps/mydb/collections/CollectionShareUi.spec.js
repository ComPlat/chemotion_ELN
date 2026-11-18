import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { unprotect, protect } from 'mobx-state-tree';
import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import { rootStore } from 'src/stores/mobx/RootStore';

Enzyme.configure({ adapter: new Adapter() });

// ElementsList is a function component: userStore/collections come from
// useContext(StoreContext), whose default value is the real `rootStore`
// singleton (no Provider needed here), and currentCollection comes from a
// useState initializer that reads UIStore.getState() synchronously - so shallow
// rendering (which never runs useEffect, i.e. never calls UIStore.listen) is
// enough as long as UIStore.getState() already returns the desired collection
// before the component is rendered.
describe('ElementsList middle-panel share indicators', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(ElementStore, 'getState').returns({ elements: {} });
    sandbox.stub(ElementStore, 'listen');
    sandbox.stub(ElementStore, 'unlisten');
    sandbox.stub(UIStore, 'listen');
    sandbox.stub(UIStore, 'unlisten');

    unprotect(rootStore);
    rootStore.userStore.currentUser = { id: 1, name: 'Test User 1' };
    rootStore.userStore.profile = null;
    rootStore.userStore.genericEls = [];
    protect(rootStore);
  });

  afterEach(() => {
    unprotect(rootStore);
    sandbox.restore();
    rootStore.userStore.currentUser = null;
    rootStore.userStore.profile = null;
    rootStore.userStore.genericEls = [];
    protect(rootStore);
  });

  // isSharedCollection is a plain (uncached) view method on the real
  // collectionsStore singleton, so it can be sinon-stubbed directly instead of
  // building a shared_with_me_collections fixture that would produce the
  // desired result.
  const renderElementsList = (currentCollection, isSharedCollection = () => false) => {
    sandbox.stub(UIStore, 'getState').returns({ currentSearchByID: null, klasses: [], currentCollection });
    unprotect(rootStore);
    sandbox.stub(rootStore.collectionsStore, 'isSharedCollection').callsFake(isSharedCollection);
    protect(rootStore);
    return shallow(<ElementsList overview={false} />);
  };

  it('shows the owned-shared icon when currentCollection.shared is true', () => {
    const wrapper = renderElementsList({ id: 12, label: 'project CU4-indigo', shared: true });

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('shows the shared-to-me icon when the store marks the collection as shared-to-me', () => {
    const isSharedCollection = sinon.stub().returns(true);
    const wrapper = renderElementsList({
      id: 69, label: '2', owner: 'User4 Complat (U4)', is_locked: false,
    }, isSharedCollection);

    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(isSharedCollection.calledWith(69)).toBe(true);
  });

  it('renders only the owned-shared icon when both flags are set (mutually exclusive)', () => {
    // The store should never report both, but the UI guard should still prefer
    // the owner indicator so we never render two adjacent share icons.
    const isSharedCollection = sinon.stub().returns(true);
    const wrapper = renderElementsList(
      { id: 12, label: 'edge', shared: true, owner: 'U4' },
      isSharedCollection
    );

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('renders no share indicator on a locked owner-root node', () => {
    const isSharedCollection = sinon.stub().returns(false);
    const wrapper = renderElementsList({
      id: 0, label: 'User4 Complat', owner: 'U4', is_locked: true,
    }, isSharedCollection);

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('renders no share indicator when currentCollection is null', () => {
    const wrapper = renderElementsList(null);

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });
});
