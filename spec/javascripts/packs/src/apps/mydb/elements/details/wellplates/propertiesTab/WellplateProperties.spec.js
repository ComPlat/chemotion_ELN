/* global describe, context, it */

import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import Wellplate from 'src/models/Wellplate';

import WellplateProperties from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateProperties';

// Empty function placeholder for required props
function emptyFunc() {}

configure({ adapter: new Adapter() });

describe('WellplateProperties', () => {
  describe('constructor()', () => {
    context('when wellplate is of size 3x5', () => {
      const wellplate = Wellplate.buildEmpty(0, 2, 2);

      const wrapper = shallow(
        React.createElement(
          WellplateProperties,
          {
            wellplate,
            changeProperties: emptyFunc,
            handleAddReadout: emptyFunc,
            handleRemoveReadout: emptyFunc,
            readoutTitles: [],
          },
        )
      );

      it('component is correct initialized', () => {
        expect(wrapper).not.toEqual(null);
      });
    });
  });
});
