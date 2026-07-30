import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';

Enzyme.configure({ adapter: new Adapter() });

// Provider stubs for the alt stores that ElementsList subscribes to.
const stubStores = (sandbox) => {
  sandbox.stub(UIStore, 'getState').returns({ currentSearchByID: null, klasses: [] });
  sandbox.stub(UIStore, 'listen');
  sandbox.stub(UIStore, 'unlisten');
  sandbox.stub(UserStore, 'getState').returns({ currentUser: {}, profile: null, genericEls: [] });
  sandbox.stub(UserStore, 'listen');
  sandbox.stub(UserStore, 'unlisten');
  sandbox.stub(ElementStore, 'getState').returns({ elements: {} });
  sandbox.stub(ElementStore, 'listen');
  sandbox.stub(ElementStore, 'unlisten');
};

// Header uses `this.context.collections.isSharedCollection(id)` to decide
// whether to show the shared-to-me indicator, so we inject a stub context.
const renderElementsList = (contextStub = { collections: { isSharedCollection: () => false } }) => {
  const wrapper = shallow(<ElementsList overview={false} />, { context: contextStub });
  wrapper.instance().context = contextStub;
  return wrapper;
};

describe('ElementsList middle-panel share indicators', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    stubStores(sandbox);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('shows the owned-shared icon when currentCollection.shared is true', () => {
    const wrapper = renderElementsList();
    wrapper.setState({
      currentCollection: { id: 12, label: 'project CU4-indigo', shared: true },
      visible: [],
      hidden: [],
    });
    wrapper.update();

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('shows the shared-to-me icon when the store marks the collection as shared-to-me', () => {
    const isSharedCollection = sinon.stub().returns(true);
    const wrapper = renderElementsList({ collections: { isSharedCollection } });
    wrapper.setState({
      currentCollection: {
        id: 69, label: '2', owner: 'User4 Complat (U4)', is_locked: false,
      },
      visible: [],
      hidden: [],
    });
    wrapper.update();

    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(isSharedCollection.calledWith(69)).toBe(true);
  });

  it('renders only the owned-shared icon when both flags are set (mutually exclusive)', () => {
    // The store should never report both, but the UI guard should still prefer
    // the owner indicator so we never render two adjacent share icons.
    const isSharedCollection = sinon.stub().returns(true);
    const wrapper = renderElementsList({ collections: { isSharedCollection } });
    wrapper.setState({
      currentCollection: { id: 12, label: 'edge', shared: true, owner: 'U4' },
      visible: [],
      hidden: [],
    });
    wrapper.update();

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('renders no share indicator on a locked owner-root node', () => {
    const isSharedCollection = sinon.stub().returns(false);
    const wrapper = renderElementsList({ collections: { isSharedCollection } });
    wrapper.setState({
      currentCollection: {
        id: 0, label: 'User4 Complat', owner: 'U4', is_locked: true,
      },
      visible: [],
      hidden: [],
    });
    wrapper.update();

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });

  it('renders no share indicator when currentCollection is null', () => {
    const wrapper = renderElementsList();
    wrapper.setState({ currentCollection: null, visible: [], hidden: [] });
    wrapper.update();

    expect(wrapper.find('[aria-label="Shared collection"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Shared to me collection"]').exists()).toBe(false);
  });
});
