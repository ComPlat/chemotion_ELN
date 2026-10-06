/* eslint-disable import/no-unresolved, no-undef */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import VersionsFetcher from 'src/fetchers/VersionsFetcher';

configure({ adapter: new Adapter() });

describe('VersionsTable', () => {
  afterEach(() => sinon.restore());

  const field = (overrides) => ({
    name: 'description',
    label: 'Description',
    kind: 'quill',
    revert: ['description'],
    ...overrides,
  });

  const selectVersion = (fields) => {
    sinon.stub(VersionsFetcher, 'fetch').returns(new Promise(() => {}));
    const wrapper = shallow(
      <VersionsTable type="reactions" id={1} element={{}} parent={{}} isEdited={false} />
    );
    wrapper.setState({ versions: [{ id: 1, changes: [{ fields }] }] });
    wrapper.instance().onSelectionChanged({ api: { getSelectedRows: () => [{ id: 1 }] } });
    return wrapper.state('versions')[0].changes[0].fields;
  };

  describe('onSelectionChanged()', () => {
    it('shows the old value as the previous version when the content was cleared', () => {
      const text = { ops: [{ insert: 'some text\n' }] };
      const [selected] = selectVersion([
        field({
          oldValue: text, newValue: {}, currentValue: {}, revertibleValue: text,
        }),
      ]);

      expect(selected.previousValue).toEqual(text);
      expect(selected.revertibleValue).toEqual(text);
    });

    it('keeps entries added since then when reverting an object-valued field', () => {
      const [selected] = selectVersion([
        field({
          name: 'variations',
          label: 'Variations',
          kind: 'json',
          oldValue: { a: { value: 1 }, b: { value: 2 } },
          newValue: { a: { value: 3 } },
          currentValue: { a: { value: 3 }, c: { value: 4 } },
          revertibleValue: { a: { value: 1 }, b: { value: 2 } },
        }),
      ]);

      expect(selected.previousValue).toEqual({ a: { value: 1 }, b: { value: 2 } });
      expect(selected.revertibleValue).toEqual({ a: { value: 1 }, b: { value: 2 }, c: { value: 4 } });
    });

    it('keeps a nested key whose previous value was empty when reverting an object-valued field', () => {
      const [selected] = selectVersion([
        field({
          name: 'variations',
          label: 'Variations',
          kind: 'json',
          oldValue: { a: { metadata: {}, value: 1 } },
          newValue: { a: { metadata: { notes: 'x' }, value: 2 } },
          currentValue: { a: { metadata: { notes: 'x' }, value: 2 } },
          revertibleValue: { a: { metadata: {}, value: 1 } },
        }),
      ]);

      expect(selected.revertibleValue).toEqual({ a: { metadata: { notes: 'x' }, value: 1 } });
    });

    it('reverts to the server value as is when the current value is a formatted string', () => {
      const composition = { C: '50', H: '5', O: '45' };
      const [selected] = selectVersion([
        field({
          name: 'data',
          label: 'Found',
          kind: 'string',
          oldValue: 'C: 50, H: 5, O: 45',
          newValue: 'C: 60.0, H: 6.0',
          currentValue: 'C: 60.0, H: 6.0',
          revertibleValue: composition,
        }),
      ]);

      expect(selected.revertibleValue).toEqual(composition);
    });

    it('does not fail when an object-valued field has no current value', () => {
      const text = { ops: [{ insert: 'some text\n' }] };
      const [selected] = selectVersion([
        field({
          oldValue: text, newValue: null, currentValue: null, revertibleValue: text,
        }),
      ]);

      expect(selected.revertibleValue).toEqual(text);
    });
  });
});
