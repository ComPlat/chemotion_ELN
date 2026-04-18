const React = require('react');
const { configure, shallow } = require('enzyme');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');
const expect = require('expect');
const sinon = require('sinon');
const {
  describe, it, beforeEach, afterEach
} = require('mocha');
const { Button, Modal } = require('react-bootstrap');
const AppModal = require('src/components/common/AppModal').default;

configure({ adapter: new Adapter() });

describe('AppModal', () => {
  let onHideSpy;

  const buildWrapper = (props = {}) => shallow(
    React.createElement(
      AppModal,
      {
        show: true,
        onHide: onHideSpy,
        title: 'Test Modal',
        ...props,
      },
      React.createElement('div', { className: 'modal-body-content' }, 'Body content')
    )
  );

  beforeEach(() => {
    onHideSpy = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('renders the title and body content', () => {
    const wrapper = buildWrapper();

    expect(wrapper.find(Modal)).toHaveLength(1);
    expect(wrapper.find(Modal.Title).text()).toEqual('Test Modal');
    expect(wrapper.find('.modal-body-content').text()).toEqual('Body content');
  });

  it('does not render a footer by default', () => {
    const wrapper = buildWrapper();

    expect(wrapper.find(Modal.Footer)).toHaveLength(0);
  });

  it('renders a footer with close and primary buttons when a primary action is provided', () => {
    const onPrimaryActionSpy = sinon.spy();
    const wrapper = buildWrapper({
      primaryActionLabel: 'Save',
      onPrimaryAction: onPrimaryActionSpy,
    });

    expect(wrapper.find(Modal.Footer)).toHaveLength(1);
    expect(wrapper.find(Button)).toHaveLength(2);
    expect(wrapper.find(Button).at(0).children().text()).toEqual('Cancel');
    expect(wrapper.find(Button).at(1).children().text()).toEqual('Save');

    wrapper.find(Button).at(1).prop('onClick')();
    expect(onPrimaryActionSpy.calledOnce).toBe(true);
  });

  it('renders an extended footer without a primary action', () => {
    const wrapper = buildWrapper({
      extendedFooter: React.createElement('span', { className: 'extended-footer-content' }, 'Extra action'),
    });

    expect(wrapper.find(Modal.Footer)).toHaveLength(1);
    expect(wrapper.find('.extended-footer-content').text()).toEqual('Extra action');
  });

  it('calls onHide when the header close button is clicked and no request handler is provided', () => {
    const wrapper = buildWrapper();
    const event = { currentTarget: {} };

    wrapper.find('button.btn-close').prop('onClick')(event);

    expect(onHideSpy.calledOnce).toBe(true);
  });

  it('calls onRequestClose with header source instead of onHide when provided', () => {
    const onRequestCloseSpy = sinon.spy();
    const wrapper = buildWrapper({ onRequestClose: onRequestCloseSpy });
    const event = { currentTarget: {} };

    wrapper.find('button.btn-close').prop('onClick')(event);

    expect(onRequestCloseSpy.calledOnce).toBe(true);
    expect(onRequestCloseSpy.firstCall.args[0]).toBe(event);
    expect(onRequestCloseSpy.firstCall.args[1]).toBe('header');
    expect(onHideSpy.called).toBe(false);
  });

  it('calls onRequestClose with footer source when the footer close button is clicked', () => {
    const onRequestCloseSpy = sinon.spy();
    const wrapper = buildWrapper({
      showFooter: true,
      closeLabel: 'Close',
      onRequestClose: onRequestCloseSpy,
    });
    const event = { currentTarget: {} };

    wrapper.find(Button).at(0).prop('onClick')(event);

    expect(onRequestCloseSpy.calledOnce).toBe(true);
    expect(onRequestCloseSpy.firstCall.args[0]).toBe(event);
    expect(onRequestCloseSpy.firstCall.args[1]).toBe('footer');
    expect(onHideSpy.called).toBe(false);
  });
});
