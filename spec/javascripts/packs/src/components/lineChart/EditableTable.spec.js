import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import EditableTable, { normalizeTime, normalizeValue, sortByTime } from 'src/components/lineChart/EditableTable';

configure({ adapter: new Adapter() });

describe('EditableTable', () => {
  const temperature = (data) => ({ valueUnit: '°C', userText: '', data });

  it('reads times as h:mm or h:mm:ss with any number of hours, and keeps decimals', () => {
    expect(normalizeTime('1:30')).toEqual('01:30:00');
    expect(normalizeTime('120:00:00')).toEqual('120:00:00');
    expect(normalizeTime('00:10:00')).toEqual('00:10:00');
    expect(normalizeTime('1:75')).toBeNull();
    expect(normalizeTime('')).toBeNull();
    expect(normalizeValue('37.5')).toEqual('37.5');
    expect(normalizeValue('-10,5')).toEqual('-10.5');
    expect(normalizeValue('abc')).toBeNull();
  });

  it('sorts rows by time, including old short times', () => {
    const rows = sortByTime([{ time: '02:00:00' }, { time: '0:01:20' }, { time: '100:00:00' }]);
    expect(rows.map((row) => row.time)).toEqual(['0:01:20', '02:00:00', '100:00:00']);
  });

  it('adds a typed row in time order and refuses an empty one', () => {
    const update = sinon.spy();
    const wrapper = mount(
      <EditableTable temperature={temperature([{ time: '02:00:00', value: '80' }])} updateTemperature={update} />
    );
    expect(wrapper.find('button[aria-label="Add row"]').prop('disabled')).toBe(true);
    wrapper.find('input').at(2).simulate('change', { target: { value: '1:30' } });
    wrapper.find('input').last().simulate('change', { target: { value: '37.5' } });
    wrapper.find('button[aria-label="Add row"]').simulate('click');

    expect(update.calledOnce).toBe(true);
    expect(update.firstCall.args[0]).toEqual([{ time: '01:30:00', value: '37.5' }, { time: '02:00:00', value: '80' }]);
  });

  it('edits and removes a row, and ignores an invalid edit', () => {
    const update = sinon.spy();
    const wrapper = mount(
      <EditableTable
        temperature={temperature([{ time: '00:00:00', value: '20' }, { time: '01:00:00', value: '40' }])}
        updateTemperature={update}
      />
    );

    wrapper.find('input').at(1).simulate('blur', { target: { value: 'hot' } });
    expect(update.called).toBe(false);

    wrapper.find('input').at(1).simulate('blur', { target: { value: '25.5' } });
    expect(update.lastCall.args[0][0]).toEqual({ time: '00:00:00', value: '25.5' });

    wrapper.find('button[aria-label="Remove row"]').first().simulate('click');
    expect(update.lastCall.args[0]).toEqual([{ time: '01:00:00', value: '40' }]);
  });

  it('starts a new row at 00:00:00', () => {
    const wrapper = mount(<EditableTable temperature={temperature([])} updateTemperature={() => {}} />);

    expect(wrapper.find('input[aria-label="New time"]').prop('value')).toEqual('00:00:00');
  });

  it('shows later-step rows read-only with their step, and edits only step 1 rows', () => {
    const update = sinon.spy();
    const wrapper = mount(
      <EditableTable
        temperature={temperature([{ time: '00:00:00', value: '30' }])}
        otherStepRows={[{ step: 2, time: '03:00:00', value: '40' }]}
        updateTemperature={update}
      />
    );
    const rows = wrapper.find('tbody tr');

    expect(wrapper.find('th').first().text()).toEqual('Step');
    expect(rows.at(0).find('input').length).toEqual(2);
    expect(rows.at(1).find('input').length).toEqual(0);
    expect(rows.at(1).text()).toEqual('203:00:0040');
    expect(rows.at(1).find('button').length).toEqual(0);

    wrapper.find('input[aria-label="New temperature"]').simulate('change', { target: { value: '35' } });
    wrapper.find('button[aria-label="Add row"]').simulate('click');
    expect(update.lastCall.args[0]).toEqual([{ time: '00:00:00', value: '30' }, { time: '00:00:00', value: '35' }]);
  });
});
