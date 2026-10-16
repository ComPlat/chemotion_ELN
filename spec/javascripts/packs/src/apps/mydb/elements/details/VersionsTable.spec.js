/* eslint-disable import/no-unresolved, no-undef */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import VersionsFetcher from 'src/fetchers/VersionsFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';

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

    it('reverts to the complete previous state, undoing additions made since', () => {
      const previous = { a: { metadata: {}, value: 1 } };
      const [selected] = selectVersion([
        field({
          name: 'variations',
          label: 'Variations',
          kind: 'json',
          oldValue: previous,
          newValue: { a: { metadata: { notes: 'x' }, value: 2 } },
          currentValue: { a: { metadata: { notes: 'x' }, value: 2 }, b: { value: 3 } },
          revertibleValue: previous,
        }),
      ]);

      expect(selected.revertibleValue).toEqual(previous);
    });

    it('reverts to an empty previous state as is', () => {
      const [selected] = selectVersion([
        field({
          name: 'variations',
          label: 'Variations',
          kind: 'json',
          oldValue: {},
          newValue: { a: { value: 1 } },
          currentValue: { a: { value: 1 } },
          revertibleValue: {},
        }),
      ]);

      expect(selected.revertibleValue).toEqual({});
    });

    it('sends the server value as is when the current value is formatted differently', () => {
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
  });

  describe('reloadEntity()', () => {
    it("reloads a sample's inventory tab too, since it keeps its own copy of the chemical", async () => {
      sinon.stub(VersionsFetcher, 'fetch').returns(new Promise(() => {}));
      const reloaded = { id: 1 };
      sinon.stub(SamplesFetcher, 'fetchById').resolves(reloaded);
      const fetchChemical = sinon.spy();
      const parent = { setState: sinon.spy(), chemicalTabRef: { current: { fetchChemical } } };
      const wrapper = shallow(
        <VersionsTable type="samples" id={1} element={{}} parent={parent} isEdited={false} />
      );

      wrapper.instance().reloadEntity();
      await SamplesFetcher.fetchById.firstCall.returnValue;

      expect(parent.setState.calledWith({ sample: reloaded })).toBe(true);
      expect(fetchChemical.calledWith(reloaded)).toBe(true);
    });
  });
});
