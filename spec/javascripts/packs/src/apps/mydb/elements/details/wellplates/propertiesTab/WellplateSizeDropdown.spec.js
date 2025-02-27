/* eslint-disable import/no-unresolved, no-undef */

import React from 'react';
import expect from 'expect';
import {
  describe, it
} from 'mocha';
import { configure, shallow } from 'enzyme';
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
