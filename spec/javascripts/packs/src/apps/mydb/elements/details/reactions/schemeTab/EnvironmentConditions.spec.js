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

import EnvironmentConditionsPanel from 'src/apps/mydb/elements/details/reactions/schemeTab/EnvironmentConditions';

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

    it('keeps only a single decimal point on humidity', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), HUMIDITY, 'a5.0.7');
      expect(onChange.firstCall.args[0].humidity.value).toBe('5.07');
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
    it('advances the unit and converts the entered value (°C to °F)', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '25', unit: '°C' } }), onChange);
      wrapper.find('button').simulate('click');
      const { temperature } = onChange.firstCall.args[0];
      expect(temperature.unit).toBe('°F');
      expect(temperature.value).toBe('77.00'); // 25 * 1.8 + 32
    });

    it('leaves a partially typed value untouched when cycling the unit', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '-', unit: '°C' } }), onChange);
      wrapper.find('button').simulate('click');
      const { temperature } = onChange.firstCall.args[0];
      expect(temperature.unit).toBe('°F');
      expect(temperature.value).toBe('-');
    });
  });
});
