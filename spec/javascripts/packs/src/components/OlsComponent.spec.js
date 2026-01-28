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

  describe('.combineChmoAndBao()', () => {
    const createRecentlySelectedNode = (children = []) => ({
      title: '-- Recently selected --',
      value: '-- Recently selected --',
      selectable: false,
      children
    });

    const createRegularNode = (title, value) => ({
      title,
      value,
      selectable: true,
      children: []
    });

    describe('when both CHMO and BAO have recently selected items', () => {
      it('merges children from both recently selected nodes', () => {
        const chmoItem1 = createRegularNode('CHMO Item 1', 'CHMO:0000001');
        const chmoItem2 = createRegularNode('CHMO Item 2', 'CHMO:0000002');
        const baoItem1 = createRegularNode('BAO Item 1', 'BAO:0000001');
        const baoItem2 = createRegularNode('BAO Item 2', 'BAO:0000002');

        const chmos = [
          createRecentlySelectedNode([chmoItem1, chmoItem2]),
          createRegularNode('CHMO Other', 'CHMO:0000003')
        ];
        const bao = [
          createRecentlySelectedNode([baoItem1, baoItem2]),
          createRegularNode('BAO Other', 'BAO:0000003')
        ];

        const result = component.instance().combineChmoAndBao(chmos, bao);

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('-- Recently selected --');
        expect(result[0].children).toHaveLength(4);
        expect(result[0].children).toEqual([chmoItem1, chmoItem2, baoItem1, baoItem2]);
        expect(result[1].title).toBe('CHMO Other');
        expect(result[2].title).toBe('BAO Other');
      });
    });

    describe('when only CHMO has recently selected items', () => {
      it('includes CHMO recently selected node with its children', () => {
        const chmoItem1 = createRegularNode('CHMO Item 1', 'CHMO:0000001');
        const chmos = [
          createRecentlySelectedNode([chmoItem1]),
          createRegularNode('CHMO Other', 'CHMO:0000002')
        ];
        const bao = [
          createRegularNode('BAO Item', 'BAO:0000001')
        ];

        const result = component.instance().combineChmoAndBao(chmos, bao);

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('-- Recently selected --');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children).toEqual([chmoItem1]);
        expect(result[1].title).toBe('CHMO Other');
        expect(result[2].title).toBe('BAO Item');
      });
    });

    describe('when only BAO has recently selected items', () => {
      it('includes BAO recently selected node with its children', () => {
        const baoItem1 = createRegularNode('BAO Item 1', 'BAO:0000001');
        const chmos = [
          createRegularNode('CHMO Item', 'CHMO:0000001')
        ];
        const bao = [
          createRecentlySelectedNode([baoItem1]),
          createRegularNode('BAO Other', 'BAO:0000002')
        ];

        const result = component.instance().combineChmoAndBao(chmos, bao);

        expect(result).toHaveLength(3);
        expect(result[0].title).toBe('-- Recently selected --');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children).toEqual([baoItem1]);
        expect(result[1].title).toBe('CHMO Item');
        expect(result[2].title).toBe('BAO Other');
      });
    });

    describe('when neither has recently selected items', () => {
      it('combines all nodes without recently selected section', () => {
        const chmos = [
          createRegularNode('CHMO Item 1', 'CHMO:0000001'),
          createRegularNode('CHMO Item 2', 'CHMO:0000002')
        ];
        const bao = [
          createRegularNode('BAO Item 1', 'BAO:0000001'),
          createRegularNode('BAO Item 2', 'BAO:0000002')
        ];

        const result = component.instance().combineChmoAndBao(chmos, bao);

        expect(result).toHaveLength(4);
        expect(result[0].title).toBe('CHMO Item 1');
        expect(result[1].title).toBe('CHMO Item 2');
        expect(result[2].title).toBe('BAO Item 1');
        expect(result[3].title).toBe('BAO Item 2');
      });
    });

    describe('when CHMO array is null', () => {
      it('handles null gracefully and uses empty array', () => {
        const bao = [
          createRegularNode('BAO Item', 'BAO:0000001')
        ];

        const result = component.instance().combineChmoAndBao(null, bao);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('BAO Item');
      });
    });

    describe('when BAO array is null', () => {
      it('handles null gracefully and uses empty array', () => {
        const chmos = [
          createRegularNode('CHMO Item', 'CHMO:0000001')
        ];

        const result = component.instance().combineChmoAndBao(chmos, null);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('CHMO Item');
      });
    });

    describe('when both arrays are null', () => {
      it('returns empty array', () => {
        const result = component.instance().combineChmoAndBao(null, null);

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('when CHMO array is empty', () => {
      it('returns only BAO nodes', () => {
        const bao = [
          createRegularNode('BAO Item', 'BAO:0000001')
        ];

        const result = component.instance().combineChmoAndBao([], bao);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('BAO Item');
      });
    });

    describe('when BAO array is empty', () => {
      it('returns only CHMO nodes', () => {
        const chmos = [
          createRegularNode('CHMO Item', 'CHMO:0000001')
        ];

        const result = component.instance().combineChmoAndBao(chmos, []);

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('CHMO Item');
      });
    });

    describe('when both arrays are empty', () => {
      it('returns empty array', () => {
        const result = component.instance().combineChmoAndBao([], []);

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('when recently selected node uses value instead of title', () => {
      it('correctly identifies recently selected node by value', () => {
        const chmoItem = createRegularNode('CHMO Item', 'CHMO:0000001');
        const chmos = [
          { value: '-- Recently selected --', children: [chmoItem] },
          createRegularNode('CHMO Other', 'CHMO:0000002')
        ];
        const bao = [
          createRegularNode('BAO Item', 'BAO:0000001')
        ];

        const result = component.instance().combineChmoAndBao(chmos, bao);

        expect(result).toHaveLength(3);
        expect(result[0].value).toBe('-- Recently selected --');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children).toEqual([chmoItem]);
      });
    });
  });
});
