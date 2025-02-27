import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import OlsTreeSelect from 'src/components/OlsComponent';
import {
  describe, it
} from 'mocha';

configure({ adapter: new Adapter() });

let currentSelectedValue;

const createWrapper = () => shallow(
  React.createElement(
    OlsTreeSelect,
    {
      selectName: "",
      selectedValue: "startingValue",
      onSelectChange: (value) => { currentSelectedValue = value; },
      selectedDisable: false,
    },
  )
);

describe('OlsComponent', () => {
  const component = createWrapper();

  describe('.OnSelectChange()', () => {
    describe('when term is null', () => {
      it(' selected item is ""', () => {
        component.instance().OnSelectChange(null);
        expect(currentSelectedValue).toBe('');
      });
    });
    describe('when term is undefined', () => {
      it(' selected item is ""', () => {
        component.instance().OnSelectChange(undefined);
        expect(currentSelectedValue).toBe('');
      });
    });
    describe('when term is a simple string', () => {
      const value = 'some text';

      it('invalid value was used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe(value);
      });
    });
    describe('when term contains one |', () => {
      const value = 'some | text';

      it('whole text is used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe(value);
      });
    });
    describe('when term contains three |', () => {
      const value = 'some | text | with | pipelines';

      it('whole text is used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe(value);
      });
    });
    describe('when term contains one $', () => {
      const value = 'some $ text';

      it('whole text is used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe(value);
      });
    });
    describe('when term contains three $', () => {
      const value = 'some $ text $ here $ again';

      it('whole text is used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe(value);
      });
    });
    describe('when term contains three $ last one is artifical id', () => {
      const value = 'another $ text $ for $550e8400-e29b-41d4-a716-446655440000';

      it('whole text is used', () => {
        component.instance().OnSelectChange(value);
        expect(currentSelectedValue).toBe('another $ text $ for');
      });
    });
  });
});
