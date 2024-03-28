/* global describe, context, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import Wellplate from 'src/models/Wellplate';

import WellplateProperties from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateProperties';

Enzyme.configure({
  adapter: new Adapter(),
});

describe('WellplateProperties', async () => {
  describe('constructor()', async () => {
    context('when wellplate is of size 3x5', async () => {
      const wellplate = Wellplate.buildEmpty(0, 2, 2);

      const wrapper = shallow(<WellplateProperties
        wellplate={wellplate}
        changeProperties={() => {}}
        handleAddReadout={() => {}}
        handleRemoveReadout={() => {}}
        readoutTitles={[]}
      />);

      it('component is correct initialized', async () => {
        expect(wrapper).not.toEqual(null);
      });
    });
  });
});
