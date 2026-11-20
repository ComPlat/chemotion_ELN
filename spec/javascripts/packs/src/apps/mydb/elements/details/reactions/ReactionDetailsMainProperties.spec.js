import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import EditableTable from 'src/components/lineChart/EditableTable';

configure({ adapter: new Adapter() });

describe('ReactionDetailsMainProperties', () => {
  it('clears the typed temperature when the list changes, so the field shows the list range', () => {
    const onInputChange = sinon.spy();
    const reaction = { temperature: { userText: 'r.t.', valueUnit: '°C', data: [] }, temperature_display: 'r.t.' };
    const wrapper = shallow(<ReactionDetailsMainProperties reaction={reaction} onInputChange={onInputChange} />);
    wrapper.setState({ showTemperatureChart: true });

    const rows = [{ time: '00:00:00', value: '30' }, { time: '02:00:00', value: '90' }];
    wrapper.find(EditableTable).prop('updateTemperature')(rows);

    expect(onInputChange.lastCall.args).toEqual(['temperatureData', { userText: '', valueUnit: '°C', data: rows }]);
  });
});
