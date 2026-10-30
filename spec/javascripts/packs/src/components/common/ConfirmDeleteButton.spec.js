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

  // Regression coverage: clicking a button also focuses it in Chromium/Windows, and
  // OverlayTrigger's default trigger set is ['hover', 'focus'], so the trigger's own hover
  // tooltip would pop open at the same time as the confirm popover below it, stacked over
  // the same icon. `find('Overlay')` distinguishes the two here by `placement` - the
  // tooltip is always "top", the confirm popover defaults to "right".
  describe('with a tooltip', () => {
    let tooltipWrapper;

    const overlayAt = (placement) => tooltipWrapper.find('Overlay')
      .filterWhere((o) => o.prop('placement') === placement)
      .first();

    beforeEach(() => {
      tooltipWrapper = mount(React.createElement(ConfirmDeleteButton, {
        header: 'Remove this?',
        tooltip: 'Remove',
        onConfirm: sinon.spy(),
      }));
    });

    afterEach(() => {
      tooltipWrapper.unmount();
    });

    it('shows the tooltip on hover alone', () => {
      tooltipWrapper.find('button').first().simulate('mouseover');
      tooltipWrapper.update();

      expect(overlayAt('top').prop('show')).toBe(true);
      expect(overlayAt('right').prop('show')).toBe(false);
    });

    it('shows the tooltip on keyboard focus alone', () => {
      tooltipWrapper.find('button').first().simulate('focus');
      tooltipWrapper.update();

      expect(overlayAt('top').prop('show')).toBe(true);
      expect(overlayAt('right').prop('show')).toBe(false);
    });

    it('does not show the tooltip alongside the confirm popover on click', () => {
      const button = tooltipWrapper.find('button').first();
      // A real click also fires focus (which is what OverlayTrigger's tooltip listens for);
      // Enzyme's simulated click alone does not, so both are dispatched explicitly here.
      button.simulate('click');
      button.simulate('focus');
      tooltipWrapper.update();

      expect(overlayAt('top').prop('show')).toBe(false);
      expect(overlayAt('right').prop('show')).toBe(true);
    });
  });
});
