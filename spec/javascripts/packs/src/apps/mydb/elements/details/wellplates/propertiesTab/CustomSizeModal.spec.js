/* eslint-disable import/no-unresolved, no-undef */

import React from 'react';
import expect from 'expect';
import {
  describe, it
} from 'mocha';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import CustomSizeModal from 'src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';
import { wellplate2x3EmptyJson } from 'fixture/wellplates/wellplate_2_3_empty';
import { wellplate8x12EmptyJson } from 'fixture/wellplates/wellplate_8_12_empty';
import Wellplate from 'src/models/Wellplate';

Enzyme.configure({
  adapter: new Adapter(),
});

describe('CustomSizeModal', async () => {
  describe('constructor()', async () => {
    context('when wellplate size 2x3 is passed', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      const wrapper = shallow(<CustomSizeModal
        wellplate={wellplate}
        showCustomSizeModal
        handleClose={() => {}}
      />);

      it('the width and height are initalized accordingly to the dimensions', async () => {
        expect(wrapper.instance().state.width).toEqual(2);
        expect(wrapper.instance().state.height).toEqual(3);
      });
    });
  });

  describe('applySizeChange()', async () => {
    context('when wellplate size 2x3 is passed and the size is changed to 4x3', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      const spy = sinon.spy();
      const wrapper = shallow(<CustomSizeModal
        wellplate={wellplate}
        showCustomSizeModal
        handleClose={spy}
      />);
      wrapper.instance().state.width = 4;
      wrapper.instance().state.height = 3;
      wrapper.instance().applySizeChange();

      it('the wellplate properties were changed', async () => {
        expect(wellplate.size).toEqual(12);
        expect(wellplate.height).toEqual(3);
        expect(wellplate.width).toEqual(4);
        expect(wellplate.wells.length).toEqual(12);
      });

      it('calls the handleClose() function', async () => {
        expect(spy.callCount).toEqual(1);
      });
    });
  });
  describe('updateDimension()', async () => {
    const wellplate = new Wellplate(wellplate2x3EmptyJson);
    const wrapper = shallow(<CustomSizeModal
      wellplate={wellplate}
      showCustomSizeModal
      handleClose={() => {}}
    />);
    describe('called with change the width to a valid value', async () => {
      wrapper.instance().updateDimension('width', 4);
      it('changes the state', async () => {
        expect(wrapper.instance().state.width).toEqual(4);
      });
    });
    describe('called with something else than a positive integer', async () => {
      wrapper.instance().updateDimension('width', NaN);
      it('not changes the state', async () => {
        expect(wrapper.instance().state.width).toEqual(4);
      });

      wrapper.instance().updateDimension('width', 'abc');
      it('not changes the state', async () => {
        expect(wrapper.instance().state.width).toEqual(4);
      });

      wrapper.instance().updateDimension('width', 2.4);
      it('not changes the state', async () => {
        expect(wrapper.instance().state.width).toEqual(4);
      });

      wrapper.instance().updateDimension('width', -5);
      it('not changes the state', async () => {
        expect(wrapper.instance().state.width).toEqual(4);
      });
    });
  });
});
