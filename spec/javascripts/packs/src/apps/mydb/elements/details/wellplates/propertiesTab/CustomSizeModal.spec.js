/* eslint-disable import/no-unresolved, no-undef */

import React from 'react';
import expect from 'expect';
import {
  describe, it
} from 'mocha';
import sinon, { spy } from 'sinon';
import { configure, shallow, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import CustomSizeModal from '@src/apps/mydb/elements/details/wellplates/propertiesTab/CustomSizeModal';
import wellplate2x3EmptyJson from '@tests/fixture/wellplates/wellplate_2_3_empty';
import Wellplate from '@src/models/Wellplate';

configure({ adapter: new Adapter() });

function emptyFunction() {}

const defaultProps = {
  showCustomSizeModal: true,
  triggerUIUpdate: emptyFunction,
  handleClose: emptyFunction,
};

function createElement(props) {
  return React.createElement(
    CustomSizeModal,
    {
      ...defaultProps,
      ...props,
    },
  );
}

function shallowWrap(props) {
  return shallow(createElement(props));
}

function mountElement(props) {
  return mount(createElement(props));
}

// SKIP TESTS as they are outdated
// instance() returns null
// state() can t be used on functional components
// triggerUIUpdate is not a prop of CustomSizeModal

describe.skip('CustomSizeModal', () => {
  const wellplate = new Wellplate(wellplate2x3EmptyJson);
  const wrapper = shallowWrap({ wellplate });
  describe('constructor()', () => {
    context('when wellplate size 2x3 is passed', () => {
      it('the width and height are initalized accordingly to the dimensions', async () => {
        expect(wrapper.width).toEqual(2);
        expect(wrapper.height).toEqual(3);
      });
    });
  });

  describe.skip('applySizeChange()', () => {
    context('when wellplate size 2x3 is passed and the size is changed to 4x3', () => {

      it('the wellplate properties were changed', async () => {
        const instance = shallowWrap({ wellplate, handleClose: spy }).instance();
        instance.state.width = 4;
        instance.state.height = 3;
        instance.applySizeChange();
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

  describe.skip('updateDimension()', () => {
    const instance = shallowWrap({ wellplate }).instance();
    describe('called with change the width to a valid value', () => {
      it('changes the state', async () => {
      instance.updateDimension('width', 4);
        expect(instance.state.width).toEqual(4);
      });
    });
    describe('called with something else than a positive integer', () => {
      it('NaN not changes the state', async () => {
      instance.updateDimension('width', NaN);
        expect(instance.state.width).toEqual(3);
      });

      it('string not changes the state', async () => {
      wrapper.instance().updateDimension('width', 'abc');
        expect(instance.state.width).toEqual(3);
      });

      it('2.4 not changes the state', async () => {
      wrapper.instance().updateDimension('width', 2.4);
        expect(instance.state.width).toEqual(3);
      });

      it('0 not changes the state', async () => {
      wrapper.instance().updateDimension('width', 0);
        expect(instance.state.width).toEqual(3);
      });

      it('-5 not changes the state', async () => {
      wrapper.instance().updateDimension('width', -5);
        expect(instance.state.width).toEqual(3);
      });
    });
  });

  describe('render()', () => {
    context('when width was set to 100', () => {
      const mountedElement = mountElement({ wellplate });

      it('the apply button is disabled', async () => {
        wrapper.instance().updateDimension('width', 100);
        expect(mountedElement.html().includes(
          '<button type="button" class="btn btn-default" disabled="">Apply</button>'
        )).toBeTruthy();
      });

      it('the width textbox has red border', async () => {
        expect(mountedElement.html().includes(
          '<input type="text" class="invalid-wellplate-size form-control"'
        )).toBeTruthy();
      });

      it('an error message appears in the width area', async () => {
        expect(mountedElement.html().includes(
          '<div class="invalid-wellplate-size-text">Size must be smaller than 100.</div>'
        )).toBeTruthy();
      });
    });
  });
});
