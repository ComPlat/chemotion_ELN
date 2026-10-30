/* eslint-disable no-unused-expressions */
// Import Component before the panel: the panel pulls in the Reaction model, whose
// import chain has a circular dependency (Component extends Sample) that only resolves
// cleanly when Component is initialized first. Without this, loading this spec ahead of
// the heavier reaction specs throws "Super expression must either be null or a function".
import 'src/models/Component';

import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import { GenUnitBtn, getGenSI } from 'chem-generic-ui';
import * as ReactionVariationsUtils
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

import EnvironmentConditionsPanel, { EnvironmentConditionsToggle }
  from 'src/apps/mydb/elements/details/reactions/schemeTab/EnvironmentConditions';

configure({ adapter: new Adapter() });

// Fresh, fully-defaulted environment so each test starts from a known shape.
const buildEnvironment = (overrides = {}) => ({
  temperature: { value: '', unit: '°C' },
  humidity: { value: '', unit: '%' },
  air_pressure: { value: '', unit: 'mbar' },
  ...overrides,
});

// Column order in the panel is temperature, humidity, air pressure.
const [TEMPERATURE, HUMIDITY, AIR_PRESSURE] = [0, 1, 2];

const renderPanel = (environment, onChange = sinon.spy()) => mount(
  <EnvironmentConditionsPanel
    open
    environment={environment}
    isDisabled={false}
    onChange={onChange}
  />
);

const changeInput = (wrapper, index, value) => {
  wrapper.find('input').at(index).simulate('change', { target: { value } });
};

describe('EnvironmentConditionsPanel', () => {
  afterEach(() => sinon.restore());

  describe('temperature hint', () => {
    [
      ['K', '-5', '0'],
      ['°C', '-300', '-273.15'],
      ['°F', '-500', '-459.67'],
    ].forEach(([unit, below, minimum]) => {
      it(`warns below absolute zero in ${unit} without changing the entered value`, () => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value: below, unit } }), onChange);

        expect(wrapper.text()).toContain('Below absolute zero');
        expect(wrapper.find('input').at(TEMPERATURE).prop('value')).toBe(below);
        expect(onChange.called).toBe(false);

        wrapper.setProps({ environment: buildEnvironment({ temperature: { value: minimum, unit } }) });
        expect(wrapper.text()).not.toContain('Below absolute zero');
        wrapper.unmount();
      });
    });

    it('does not warn for valid, empty or incomplete temperature values', () => {
      ['-25', '', '-', '.'].forEach((value) => {
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }));
        expect(wrapper.text()).not.toContain('Below absolute zero');
        wrapper.unmount();
      });
    });
  });

  describe('numeric normalization', () => {
    it('strips letters and converts a decimal comma to a dot on temperature', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), TEMPERATURE, '12,3abc');
      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].temperature.value).toBe('12.3');
    });

    it('keeps a leading minus on temperature since sub-zero values are valid', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), TEMPERATURE, '-4,5');
      expect(onChange.firstCall.args[0].temperature.value).toBe('-4.5');
    });

    it('stops at a second decimal separator on humidity', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), HUMIDITY, 'a5.0.7');
      expect(onChange.firstCall.args[0].humidity.value).toBe('5.0');
    });

    it('does not merge digits after mixed decimal separators', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), AIR_PRESSURE, '1013,25.7');
      expect(onChange.firstCall.args[0].air_pressure.value).toBe('1013.25');
    });

    it('clears incomplete values on blur', () => {
      ['-', '.', '-.'].forEach((value) => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }), onChange);
        wrapper.find('input').at(TEMPERATURE).simulate('blur');
        expect(onChange.firstCall.args[0].temperature.value).toBe('');
        wrapper.unmount();
      });
    });

    it('does not mark an untouched empty field as changed on blur', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      wrapper.find('input').at(TEMPERATURE).simulate('blur');
      expect(onChange.called).toBe(false);
      wrapper.unmount();
    });

    it('drops a minus sign on air pressure since negatives are not allowed there', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), AIR_PRESSURE, '-1013');
      expect(onChange.firstCall.args[0].air_pressure.value).toBe('1013');
    });
  });

  describe('humidity hint', () => {
    it('nudges when humidity is above 100', () => {
      const wrapper = renderPanel(buildEnvironment({ humidity: { value: '150', unit: '%' } }));
      expect(wrapper.text()).toContain('Usually 0 to 100%');
    });

    it('stays silent for an in-range humidity', () => {
      const wrapper = renderPanel(buildEnvironment({ humidity: { value: '80', unit: '%' } }));
      expect(wrapper.text()).not.toContain('Usually 0 to 100%');
    });
  });

  describe('temperature unit cycling', () => {
    it('leaves an unknown legacy temperature unit unchanged', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '22', unit: 'C' } }), onChange);
      wrapper.find('button').at(0).simulate('click');

      expect(onChange.called).toBe(false);
      wrapper.unmount();
    });

    it('advances the unit and converts the entered value (°C to °F)', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '25', unit: '°C' } }), onChange);
      wrapper.find('button').at(0).simulate('click');
      const { temperature } = onChange.firstCall.args[0];
      expect(temperature.unit).toBe('°F');
      expect(temperature.value).toBe('77'); // 25 * 1.8 + 32
    });

    it('preserves the original precision across repeated unit cycles', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '20.123', unit: '°F' } }), onChange);
      for (let i = 0; i < 9; i += 1) {
        wrapper.find('button').at(0).simulate('click');
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
      }
      expect(wrapper.prop('environment').temperature).toEqual({ value: '20.123', unit: '°F' });
      wrapper.unmount();
    });

    it('converts from a newly edited value instead of the previous original', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '25', unit: '°C' } }), onChange);
      wrapper.find('button').at(0).simulate('click');
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      changeInput(wrapper, TEMPERATURE, '32');
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      wrapper.find('button').at(0).simulate('click');
      expect(onChange.lastCall.args[0].temperature).toEqual({ value: '273.15', unit: 'K' });
      wrapper.unmount();
    });

    it('leaves a partially typed value untouched when cycling the unit', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '-', unit: '°C' } }), onChange);
      wrapper.find('button').at(0).simulate('click');
      const { temperature } = onChange.firstCall.args[0];
      expect(temperature.unit).toBe('°F');
      expect(temperature.value).toBe('-');
    });
  });

  describe('air pressure unit cycling', () => {
    const cyclePressure = (wrapper) => wrapper.find('button.gen-unit-btn').simulate('click');

    it('converts mbar to atm and keeps the other environment fields', () => {
      const onChange = sinon.spy();
      const environment = buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } });
      const wrapper = renderPanel(environment, onChange);
      cyclePressure(wrapper);
      expect(onChange.lastCall.args[0]).toEqual({
        ...environment, air_pressure: { value: '1', unit: 'atm' },
      });
      wrapper.unmount();
    });

    it('cycles through all supported units and restores the original precision', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25789', unit: 'mbar' } }), onChange);
      const keys = getGenSI('pressure').map(({ key }) => key);
      const start = keys.indexOf('mbar');
      const units = [...keys.slice(start + 1), ...keys.slice(0, start + 1)];
      units.forEach((unit) => {
        cyclePressure(wrapper);
        const environment = onChange.lastCall.args[0];
        expect(environment.air_pressure.unit).toBe(unit);
        wrapper.setProps({ environment });
      });
      expect(wrapper.prop('environment').air_pressure.value).toBe('1013.25789');
      wrapper.unmount();
    });

    it('preserves small pressure readings instead of rounding them to zero', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '0.00101325', unit: 'mbar' } }), onChange);
      cyclePressure(wrapper);
      expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '0.000001', unit: 'atm' });
      wrapper.unmount();
    });

    it('leaves the reading and unit unchanged when a legacy unit is unknown', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'hPa' } }), onChange);
      wrapper.find(GenUnitBtn).prop('fnCb')({ unit: 'atm' });

      expect(onChange.called).toBe(false);
      expect(wrapper.prop('environment').air_pressure).toEqual({ value: '1013.25', unit: 'hPa' });
      wrapper.unmount();
    });

    it('leaves the reading and unit unchanged when the target unit is unknown', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } }), onChange);
      wrapper.find(GenUnitBtn).prop('fnCb')({ unit: 'unknown' });

      expect(onChange.called).toBe(false);
      wrapper.unmount();
    });

    it('leaves the reading and unit unchanged when unit metadata is unavailable', () => {
      sinon.stub(ReactionVariationsUtils, 'convertGenericUnit').returns(null);
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } }), onChange);
      wrapper.find(GenUnitBtn).prop('fnCb')({ unit: 'atm' });

      expect(onChange.called).toBe(false);
      wrapper.unmount();
    });

    it('uses an edited measurement on the next unit change', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } }), onChange);
      cyclePressure(wrapper);
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      changeInput(wrapper, AIR_PRESSURE, '2');
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      cyclePressure(wrapper);
      expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '202650', unit: 'pa' });
      wrapper.unmount();
    });

    it('changes units on an empty field without introducing a value', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      cyclePressure(wrapper);
      expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '', unit: 'atm' });
      wrapper.unmount();
    });

    it('disables both the pressure input and its unit button for read-only reactions', () => {
      const wrapper = renderPanel(buildEnvironment());
      wrapper.setProps({ isDisabled: true });
      expect(wrapper.find('input').at(AIR_PRESSURE).prop('disabled')).toBe(true);
      expect(wrapper.find('fieldset').prop('disabled')).toBe(true);
      expect(wrapper.find('button.gen-unit-btn').getDOMNode().matches(':disabled')).toBe(true);
      wrapper.unmount();
    });
  });

  it('links the toggle to the collapsible panel', () => {
    const wrapper = mount(
      <EnvironmentConditionsToggle open={false} isSet={false} onToggle={() => {}} panelId="test-environment" />
    );
    const panel = renderPanel(buildEnvironment());
    panel.setProps({ panelId: 'test-environment' });
    expect(wrapper.find('button').prop('aria-controls')).toBe(panel.find('.environment-conditions').prop('id'));
    expect(wrapper.find('button').prop('aria-expanded')).toBe(false);
    wrapper.unmount();
    panel.unmount();
  });
});
