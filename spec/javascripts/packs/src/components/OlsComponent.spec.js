import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import OlsTreeSelect from 'src/components/OlsComponent';
import UserStore from 'src/stores/alt/stores/UserStore';
import sinon from 'sinon';
configure({ adapter: new Adapter() });

let currentSelectedValue;

const createWrapper = () => shallow(
  React.createElement(
    OlsTreeSelect,
    {
      selectName: '',
      selectedValue: 'startingValue',
      onSelectChange: (value) => { currentSelectedValue = value; },
      selectedDisable: false,
    },
  )
);

describe('OlsComponent', () => {
  const component = createWrapper();
  after(() => component.unmount());

  describe('ontology sources', () => {
    const chmo = { title: 'NMR', value: 'CHMO:0000593 | NMR' };
    const bao = { title: 'bioassay', value: 'BAO:0000001 | bioassay' };
    const rxno = { title: 'reaction', value: 'RXNO:0000001 | reaction' };
    let wrapper;

    beforeEach(() => {
      sinon.stub(UserStore, 'getState').returns({ chmos: [chmo], bao: [bao], rxnos: [rxno] });
      wrapper = createWrapper();
    });

    afterEach(() => {
      wrapper.unmount();
      sinon.restore();
    });

    it('offers both ontologies in the analysis selector', () => {
      wrapper.setProps({ selectName: 'chmo' });
      expect(wrapper.prop('treeData')).toEqual([chmo, bao]);
    });

    it('keeps the dedicated BAO and reaction selectors', () => {
      wrapper.setProps({ selectName: 'bao' });
      expect(wrapper.prop('treeData')).toEqual([bao]);
      wrapper.setProps({ selectName: 'rxno' });
      expect(wrapper.prop('treeData')).toEqual([rxno]);
    });

    it('updates an already mounted selector when BAO finishes loading', () => {
      wrapper.setProps({ selectName: 'chmo' });
      wrapper.instance().onUserStoreChange({ bao: [] });
      expect(wrapper.prop('treeData')).toEqual([chmo]);
      wrapper.instance().onUserStoreChange({ bao: [bao] });
      expect(wrapper.prop('treeData')).toEqual([chmo, bao]);
    });

    it('saves the canonical BAO value without its tree UUID', () => {
      wrapper.setProps({ selectName: 'chmo' });
      wrapper.prop('onChange')('BAO:0000001 | bioassay $550e8400-e29b-41d4-a716-446655440000');
      expect(currentSelectedValue).toBe('BAO:0000001 | bioassay');
    });
  });

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
