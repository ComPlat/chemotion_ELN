import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import ConfirmDeleteButton from 'src/components/common/ConfirmDeleteButton';

configure({ adapter: new Adapter() });

// Regression coverage for https://github.com/ComPlat/chemotion_ELN/issues/2835: a
// focus-triggered popover hides itself on blur, and clicking a button inside the popover
// blurs the trigger before that button's own click event fires, so "Yes" could silently do
// nothing. These specs drive the component through the real trigger-click -> open ->
// click-"Yes"/"No" sequence (not internal handlers directly), so a regression back to a
// focus/blur-driven popover would fail here.
describe('ConfirmDeleteButton', () => {
  let onConfirm;
  let wrapper;

  const findButtonByText = (text) => wrapper
    .findWhere((node) => node.type() === 'button' && node.text() === text)
    .first();

  // Overlay uses a Fade transition by default, so a closed popover can still linger in the
  // DOM mid-exit-animation - checking Overlay's `show` prop reflects the state change
  // immediately, without depending on transition timing.
  const isOverlayShown = () => wrapper.find('Overlay').first().prop('show');

  beforeEach(() => {
    onConfirm = sinon.spy();
    wrapper = mount(React.createElement(ConfirmDeleteButton, {
      header: 'Remove this?',
      onConfirm,
    }));
  });

  afterEach(() => {
    wrapper.unmount();
    sinon.restore();
  });

  it('does not show the confirmation popover before the trigger is clicked', () => {
    expect(isOverlayShown()).toBe(false);
  });

  it('opens the confirmation popover on trigger click', () => {
    wrapper.find('button').first().simulate('click');
    wrapper.update();

    expect(isOverlayShown()).toBe(true);
    expect(wrapper.text()).toContain('Remove this?');
  });

  it('keeps the popover open on blur (not focus/blur-driven, unlike the old implementation)', () => {
    wrapper.find('button').first().simulate('click');
    wrapper.update();

    // This is exactly the mechanism that silently swallowed "Yes" clicks pre-fix: a
    // focus-triggered popover hides on blur before a click inside it can register.
    wrapper.find('button').first().simulate('blur');
    wrapper.update();

    expect(isOverlayShown()).toBe(true);
  });

  it('calls onConfirm and closes the popover when "Yes" is clicked', () => {
    wrapper.find('button').first().simulate('click');
    wrapper.update();

    findButtonByText('Yes').simulate('click');
    wrapper.update();

    expect(onConfirm.calledOnce).toBe(true);
    expect(isOverlayShown()).toBe(false);
  });

  it('closes the popover without calling onConfirm when "No" is clicked', () => {
    wrapper.find('button').first().simulate('click');
    wrapper.update();

    findButtonByText('No').simulate('click');
    wrapper.update();

    expect(onConfirm.called).toBe(false);
    expect(isOverlayShown()).toBe(false);
  });

  it('closes the popover again when the trigger is clicked a second time', () => {
    wrapper.find('button').first().simulate('click');
    wrapper.update();
    expect(isOverlayShown()).toBe(true);

    wrapper.find('button').first().simulate('click');
    wrapper.update();
    expect(isOverlayShown()).toBe(false);
  });
});
