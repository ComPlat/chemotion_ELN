/* eslint-disable import/no-unresolved, no-undef */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { Button } from 'react-bootstrap';
import VersionsTableChanges from 'src/apps/mydb/elements/details/VersionsTableChanges';

configure({ adapter: new Adapter() });

describe('VersionsTableChanges', () => {
  it('sends the columns linked to a ticked field along with it', () => {
    const handleRevert = sinon.spy();
    const data = {
      createdAt: '2026-01-01T00:00:00Z',
      changes: [{
        db_id: 1,
        klass_name: 'Sample',
        name: ['Sample Properties'],
        fields: [{
          name: 'purity',
          label: 'Purity',
          kind: 'string',
          revert: ['purity', 'density'],
          oldValue: 0.5,
          currentValue: 0.9,
          revertibleValue: 0.5,
          linkedRevertibleValues: { density: 1.0 },
          checkbox: true,
        }],
      }],
    };
    const wrapper = shallow(
      <VersionsTableChanges
        data={data}
        handleRevert={handleRevert}
        isEdited={false}
        renderRevertView
        toggleRevertView={() => {}}
      />
    );

    wrapper.find(Button).filterWhere((button) => button.prop('variant') === 'danger').simulate('click');

    expect(handleRevert.firstCall.args[0]).toEqual([{
      db_id: 1,
      klass_name: 'Sample',
      fields: [{ name: 'purity', value: 0.5 }, { name: 'density', value: 1.0 }],
    }]);
  });
});
