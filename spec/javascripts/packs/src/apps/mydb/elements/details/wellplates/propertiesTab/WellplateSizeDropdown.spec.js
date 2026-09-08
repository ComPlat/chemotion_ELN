/* eslint-disable import/no-unresolved, no-undef */

import React from 'react';
import expect from 'expect';
import { configure, shallow, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import WellplateSizeDropdown from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateSizeDropdown';
import wellplate2x3EmptyJson from 'fixture/wellplates/wellplate_2_3_empty';
import wellplate8x12EmptyJson from 'fixture/wellplates/wellplate_8_12_empty';
import Wellplate from 'src/models/Wellplate';

configure({ adapter: new Adapter() });

function emptyFunction() {}

describe.skip('WellplateSizeDropdown', () => {
  describe.skip('constructor()', () => {
    context.skip('when wellplate size 2x3 is not in option list', () => {
      it('the current state has correct currentSize property', () => {
        const wellplate = new Wellplate(wellplate2x3EmptyJson);
        const wrapper = shallow(
          React.createElement(
            WellplateSizeDropdown,
            { wellplate: wellplate, triggerUIUpdate: emptyFunction },
          )
        );

        expect(wrapper.instance().state.currentSize).toEqual({ value: '2;3', label: '6 (2x3)' });
      });
    });
    context.skip('when wellplate size 12x8 is  option list', () => {
      it('the current state has correct currentSize property', () => {
        const wellplate = new Wellplate(wellplate8x12EmptyJson);
        const wrapper = shallow(
          React.createElement(
            WellplateSizeDropdown,
            { wellplate: wellplate, triggerUIUpdate: emptyFunction },
          )
        );

        expect(wrapper.instance().state.currentSize).toEqual({ value: '12;8', label: '96 (12x8)' });
      });
    });
  });

  describe.skip('changeSizeOption()', () => {
    context('when wellplate size 2x3 is not in option list and changed to 4x3', () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      const wrapper = shallow(
        React.createElement(
          WellplateSizeDropdown,
          { wellplate: wellplate, triggerUIUpdate: emptyFunction },
        )
      );

      it('the state of the react component was changed', async () => {
        wrapper.instance().changeSizeOption({ value: '4;3', label: '12 (4x3)' });
        expect(wrapper.instance().state.currentSize).toEqual({ value: '4;3', label: '12 (4x3)' });
      });

      it('the wellplate properties were changed', async () => {
        wrapper.instance().changeSizeOption({ value: '4;3', label: '12 (4x3)' });
        expect(wellplate.size).toEqual(12);
        expect(wellplate.height).toEqual(3);
        expect(wellplate.width).toEqual(4);
      });
      it('the wellplate number of wells is equal to 12', async () => {
        wrapper.instance().changeSizeOption({ value: '4;3', label: '12 (4x3)' });
        expect(wellplate.wells.length).toEqual(12);
      });
    });
    context.skip('when wellplate size 2x3 is changed to 1x2', () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      const wrapper = shallow(
        React.createElement(
          WellplateSizeDropdown,
          { wellplate: wellplate, triggerUIUpdate: emptyFunction },
        )
      );
      wrapper.instance()?.changeSizeOption({ value: '1;2', label: '2 (1x2)' });

      it('the wellplate properties were changed', async () => {
        expect(wellplate.size).toEqual(2);
        expect(wellplate.height).toEqual(2);
        expect(wellplate.width).toEqual(1);
      });
      it('the wellplate number of wells is equal to 2', async () => {
        expect(wellplate.wells.length).toEqual(2);
      });
    });
  });
});

describe('WellplateSizeDropdown (functional component)', () => {
  // A saved wellplate keeps whatever wells the server sent rather than
  // fabricating a grid, so a realistic one has to carry them.
  function savedWellplate(attrs = {}) {
    const wells = [];
    for (let y = 1; y <= 8; y += 1) {
      for (let x = 1; x <= 12; x += 1) {
        wells.push({ id: `well-${x}-${y}`, position: { x, y }, readouts: [] });
      }
    }

    return new Wellplate({
      ...wellplate8x12EmptyJson, is_new: false, wells, ...attrs
    });
  }

  function selectedOption(wrapper) {
    return wrapper.find('option').filterWhere((o) => o.props().value === wrapper.find('select').props().value);
  }

  it('shows the actual size in the dropdown when it is not one of the standard options', () => {
    const wellplate = new Wellplate(wellplate2x3EmptyJson); // 2x3 is not a standard size
    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wrapper.find('select').props().value).toEqual('2 3');
    expect(selectedOption(wrapper).props().label).toEqual('6 (2x3)');
  });

  it('does not add a duplicate option for a standard size', () => {
    const wellplate = new Wellplate(wellplate8x12EmptyJson); // 12x8 is a standard size
    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    const matching = wrapper.find('option').filterWhere((o) => o.props().value === '12 8');
    expect(matching.length).toEqual(1);
    expect(selectedOption(wrapper).props().label).toEqual('96 (12x8)');
  });

  // A saved wellplate can be resized now; what locks the control is an unsaved
  // well edit, because a resize is persisted separately and must not race one.
  it('stays editable on a saved wellplate with no pending well changes', () => {
    const wellplate = savedWellplate();
    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wrapper.find('select').props().disabled).toEqual(false);
    expect(wrapper.find('button.create-own-size-button').props().disabled).toEqual(false);
  });

  // The resize round-trip replaces the whole element, so any unsaved edit
  // would go with it - not only an edit to the wells.
  it('locks the size while an unrelated edit is unsaved', () => {
    const wellplate = savedWellplate();
    wellplate.name = 'Renamed but not saved';

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wellplate.hasPendingWellChanges).toEqual(false);
    expect(wrapper.find('select').props().disabled).toEqual(true);
    const overlay = wrapper.find('OverlayTrigger').props().overlay;
    expect(shallow(overlay({})).text()).toEqual('Save your changes before changing the size.');
  });

  it('does not lock a wellplate that has not been saved yet', () => {
    // Nothing is persisted, so changeSize runs in memory and loses nothing.
    const wellplate = Wellplate.buildEmpty(1, 4, 3);

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wrapper.find('select').props().disabled).toEqual(false);
  });

  it('locks the size while well changes are unsaved, and explains why', () => {
    const wellplate = savedWellplate();
    wellplate.wells[0].readouts = [{ value: '42', unit: 'nM' }];

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wellplate.hasPendingWellChanges).toEqual(true);
    expect(wrapper.find('select').props().disabled).toEqual(true);
    expect(wrapper.find('button.create-own-size-button').props().disabled).toEqual(true);
    const overlay = wrapper.find('OverlayTrigger').props().overlay;
    expect(shallow(overlay({})).text()).toEqual('Save your changes to the wells before changing the size.');
  });

  // A disabled control dispatches no mouse events and they do not bubble, so
  // the trigger has to sit on a wrapper that is not itself disabled.
  it('puts the tooltip on a wrapper that can actually receive the hover', () => {
    const wellplate = savedWellplate();
    wellplate.wells[0].readouts = [{ value: '42', unit: 'nM' }];

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    const trigger = wrapper.find('OverlayTrigger');
    expect(trigger.find('span').first().props().tabIndex).toEqual(0);
    expect(trigger.find('InputGroup').props().style).toEqual({ pointerEvents: 'none' });
  });

  it('locks the size on a read-only wellplate', () => {
    const wellplate = savedWellplate({ can_update: false });
    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(wrapper.find('select').props().disabled).toEqual(true);
    const overlay = wrapper.find('OverlayTrigger').props().overlay;
    expect(shallow(overlay({})).text()).toEqual('You cannot edit this wellplate.');
  });

  // The reason is worked out by hashing every well, so it must not be computed
  // while merely rendering - only when a tooltip is actually shown.
  it('does not compute the lock reason until the tooltip is rendered', () => {
    const wellplate = savedWellplate();
    wellplate.name = 'Renamed but not saved';

    let reasonComputed = 0;
    Object.defineProperty(wellplate, 'hasPendingWellChanges', {
      get() { reasonComputed += 1; return false; },
    });

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    expect(reasonComputed).toEqual(0);

    const overlay = wrapper.find('OverlayTrigger').props().overlay;
    expect(typeof overlay).toEqual('function');
    shallow(overlay({}));
    expect(reasonComputed).toEqual(1);
  });

  // "Define later" (0x0) used to be offered unconditionally and wiped every
  // placed sample without a word.
  it('disables sizes that would delete wells holding data', () => {
    const wellplate = savedWellplate();
    wellplate.wells[95].readouts = [{ value: '42', unit: 'nM' }]; // H12, the far corner
    wellplate.updateChecksum(); // treat that as the saved state

    const wrapper = mount(
      <WellplateSizeDropdown wellplate={wellplate} updateWellplate={emptyFunction} />
    );

    const optionFor = (value) => wrapper.find('option').filterWhere((o) => o.props().value === value);
    expect(optionFor('0 0').props().disabled).toEqual(true);
    expect(optionFor('4 3').props().disabled).toEqual(true);
    expect(optionFor('24 16').props().disabled).toEqual(false);
    expect(optionFor('0 0').props().label).toContain('would delete filled wells');
  });
});
