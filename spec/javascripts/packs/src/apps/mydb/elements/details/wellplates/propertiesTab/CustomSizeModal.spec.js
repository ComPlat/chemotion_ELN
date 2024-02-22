/* eslint-disable import/no-unresolved, no-undef */

import React from 'react';
import expect from 'expect';
import {
  describe, it
} from 'mocha';
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
});
