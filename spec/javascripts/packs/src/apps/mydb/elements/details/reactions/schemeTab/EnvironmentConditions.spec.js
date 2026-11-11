/* eslint-disable no-unused-expressions */
import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import { getGenSI } from 'chem-generic-ui';
import { ENVIRONMENT_UNITS, isEnvironmentNumber, normalizeEnvironmentUnit } from 'src/utilities/EnvironmentConditions';
import * as MeasurementConversions from 'src/utilities/MeasurementConversions';

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
const PRESSURE_UNIT_BUTTON = 'button[aria-label="Toggle air pressure unit"]';

const mountedWrappers = [];
const mountComponent = (element) => {
  const wrapper = mount(element);
  mountedWrappers.push(wrapper);
  return wrapper;
};

const renderPanel = (environment, onChange = sinon.spy()) => mountComponent(
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

// Re-evaluate the import-time definitions without changing the modules other specs use.
const loadPanelWithPressureUnits = (pressureUnits) => {
  // Stub the underlying CommonJS export; chem-generic-ui exposes a read-only getter.
  const core = require('generic-ui-core');
  const getUnits = core.genUnits;
  sinon.stub(core, 'genUnits').callsFake((quantity, ...args) => (
    quantity === 'pressure' ? pressureUnits : getUnits(quantity, ...args)
  ));
  const paths = [
    require.resolve('src/utilities/EnvironmentConditions'),
    require.resolve('src/apps/mydb/elements/details/reactions/schemeTab/EnvironmentConditions'),
  ];
  const cached = paths.map((path) => require.cache[path]);
  try {
    paths.forEach((path) => { delete require.cache[path]; });
    return { ...require(paths[0]), Panel: require(paths[1]).default };
  } finally {
    paths.forEach((path, index) => { require.cache[path] = cached[index]; });
  }
};

describe('EnvironmentConditionsPanel', () => {
  afterEach(() => {
    try {
      mountedWrappers.forEach((wrapper) => {
        if (wrapper.exists()) { wrapper.unmount(); }
      });
    } finally {
      mountedWrappers.length = 0;
      sinon.restore();
    }
  });

  describe('unsupported units', () => {
    [
      ['temperature', TEMPERATURE, 'F'],
      ['temperature', TEMPERATURE, 'degF'],
      ['temperature', TEMPERATURE, '°c'],
      ['humidity', HUMIDITY, 'percent'],
      ['air_pressure', AIR_PRESSURE, 'psi'],
      ['air_pressure', AIR_PRESSURE, 'mPa'],
      ['air_pressure', AIR_PRESSURE, 'KPa'],
      ['air_pressure', AIR_PRESSURE, ' psi '],
    ].forEach(([field, index, unit]) => {
      it(`preserves ${field} in ${JSON.stringify(unit)} as a read-only reading`, () => {
        const reading = { value: '14.7', unit };
        const environment = buildEnvironment({ [field]: reading });
        const onChange = sinon.spy();
        const wrapper = renderPanel(environment, onChange);

        expect(wrapper.find('input').at(index).prop('value')).toBe(reading.value);
        expect(wrapper.find('input').at(index).prop('readOnly')).toBe(true);
        expect(wrapper.text()).toContain(unit);
        expect(wrapper.text()).toContain('Unsupported unit; reading is read-only.');
        if (field === 'temperature') {
          expect(wrapper.find('button').at(0).prop('disabled')).toBe(true);
          wrapper.find('button').at(0).simulate('click');
        }
        if (field === 'air_pressure') {
          expect(wrapper.find(PRESSURE_UNIT_BUTTON).exists()).toBe(false);
        }
        changeInput(wrapper, index, '25');
        wrapper.find('input').at(index).simulate('blur');
        expect(onChange.called).toBe(false);

        // Editing a supported field must still keep the unsupported reading intact.
        changeInput(wrapper, field === 'humidity' ? TEMPERATURE : HUMIDITY, '42');
        expect(onChange.lastCall.args[0][field]).toEqual(reading);
        wrapper.unmount();
      });
    });
  });

  describe('numeric normalization', () => {
    it('converts a decimal comma to a dot on temperature', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      changeInput(wrapper, TEMPERATURE, '12,3');
      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].temperature.value).toBe('12.3');
      wrapper.unmount();
    });

    it('keeps a leading minus on temperature since sub-zero values are valid', () => {
      const onChange = sinon.spy();
      changeInput(renderPanel(buildEnvironment(), onChange), TEMPERATURE, '-4,5');
      expect(onChange.firstCall.args[0].temperature.value).toBe('-4.5');
    });

    it('preserves a pasted Unicode minus on temperature and converts the signed reading', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      changeInput(wrapper, TEMPERATURE, '−5');
      expect(onChange.lastCall.args[0].temperature).toEqual({ value: '-5', unit: '°C' });
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      wrapper.find('button').at(0).simulate('click');
      expect(onChange.lastCall.args[0].temperature).toEqual({ value: '23', unit: '°F' });
      wrapper.unmount();
    });

    it('accepts grouped pressure pastes and converts the complete reading', () => {
      ['1,013.25', '1.013,25'].forEach((value) => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment(), onChange);
        wrapper.find('input').at(AIR_PRESSURE).simulate('paste', {
          target: { value: '', selectionStart: 0, selectionEnd: 0 },
          clipboardData: { getData: () => value },
          preventDefault: sinon.spy(),
        });
        expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '1013.25', unit: 'mbar' });
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
        wrapper.find(PRESSURE_UNIT_BUTTON).simulate('click');
        expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '1', unit: 'atm' });
        wrapper.unmount();
      });
    });

    ['temperature', 'humidity', 'air_pressure'].forEach((field, index) => {
      it(`refuses malformed ${field} edits, keeping the previous reading through blur`, () => {
        ['42', '20-22', ''].forEach((previous) => {
          ['12,3abc', 'a5.0.7', '1013,25.7', '1.013e5'].forEach((value) => {
            const environment = buildEnvironment();
            environment[field].value = previous;
            if (field === 'air_pressure') { environment[field].unit = 'pa'; }
            const onChange = sinon.spy();
            const wrapper = renderPanel(environment, onChange);
            changeInput(wrapper, index, value);

            expect(onChange.called).toBe(false);
            expect(wrapper.find('input').at(index).prop('value')).toBe(previous);
            expect(wrapper.find('input').at(index).hasClass('is-invalid')).toBe(false);
            expect(wrapper.find('.invalid-feedback').exists()).toBe(false);
            expect(wrapper.find('small.text-muted').text()).toBe('Input not accepted; previous value kept.');
            wrapper.find('input').at(index).simulate('blur');
            expect(onChange.called).toBe(false);
            expect(wrapper.find('input').at(index).prop('value')).toBe(previous);
            wrapper.unmount();
          });
        });
      });
    });

    it('accepts a valid edit after refusing malformed input', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      changeInput(wrapper, TEMPERATURE, '1.013e5');
      expect(onChange.called).toBe(false);
      expect(wrapper.text()).toContain('Input not accepted; previous value kept.');
      changeInput(wrapper, TEMPERATURE, '−5');
      expect(onChange.calledOnce).toBe(true);
      expect(onChange.lastCall.args[0].temperature.value).toBe('-5');
      expect(wrapper.text()).not.toContain('Input not accepted; previous value kept.');
      wrapper.unmount();
    });

    it('keeps the original conversion source after rejecting a paste', () => {
      const original = { value: '20.1234567890123456789', unit: '°F' };
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ temperature: original }), onChange);
      wrapper.find('button').at(0).simulate('click');
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      onChange.resetHistory();

      changeInput(wrapper, TEMPERATURE, '1.013e5');
      expect(onChange.called).toBe(false);
      for (let step = 0; step < 2; step += 1) {
        wrapper.find('button').at(0).simulate('click');
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
      }
      expect(wrapper.prop('environment').temperature).toEqual(original);
      expect(wrapper.text()).not.toContain('Input not accepted; previous value kept.');
      wrapper.unmount();
    });

    it('clears newly typed incomplete values on blur', () => {
      ['-', '.', '-.'].forEach((value) => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment(), onChange);
        changeInput(wrapper, TEMPERATURE, value);
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
        wrapper.find('input').at(TEMPERATURE).simulate('blur');
        expect(onChange.lastCall.args[0].temperature.value).toBe('');
        wrapper.unmount();
      });
    });

    ['temperature', 'humidity', 'air_pressure'].forEach((field, index) => {
      it(`preserves untouched imported ${field} text on blur`, () => {
        ['20-22', '21,5', '-', '.', '-.'].forEach((value) => {
          const environment = buildEnvironment();
          environment[field].value = value;
          const onChange = sinon.spy();
          const wrapper = renderPanel(environment, onChange);

          wrapper.find('input').at(index).simulate('focus');
          wrapper.find('input').at(index).simulate('blur');

          expect(wrapper.find('input').at(index).prop('value')).toBe(value);
          expect(onChange.called).toBe(false);
          wrapper.unmount();
        });
      });
    });

    it('does not mark an untouched empty field as changed on blur', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment(), onChange);
      wrapper.find('input').at(TEMPERATURE).simulate('blur');
      expect(onChange.called).toBe(false);
      wrapper.unmount();
    });

    it('rejects negative humidity and pressure instead of changing their signs', () => {
      [HUMIDITY, AIR_PRESSURE].forEach((index) => {
        ['-5', '−5'].forEach((value) => {
          const onChange = sinon.spy();
          const wrapper = renderPanel(buildEnvironment(), onChange);
          changeInput(wrapper, index, value);
          expect(onChange.called).toBe(false);
          expect(wrapper.find('input').at(index).prop('value')).toBe('');
          expect(wrapper.find('small.text-muted').text()).toBe('Input not accepted; previous value kept.');
          wrapper.unmount();
        });
      });
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

  describe('temperature hint', () => {
    [['-300', '°C'], ['-460', '°F'], ['-10', 'K'], ['-273,16', '°C']].forEach(([value, unit]) => {
      it(`warns about ${value} ${unit} while still allowing edits`, () => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit } }), onChange);
        expect(wrapper.text()).toContain('Below absolute zero (0 K)');
        expect(wrapper.find('input').at(TEMPERATURE).prop('readOnly')).toBe(false);
        changeInput(wrapper, TEMPERATURE, '-500');
        expect(onChange.lastCall.args[0].temperature).toEqual({ value: '-500', unit });
      });
    });

    [['-273.15', '°C'], ['-459.67', '°F'], ['0', 'K'], ['-10', '°C'], ['', 'K'], ['-', '°C']]
      .forEach(([value, unit]) => {
        it(`has no hint for ${JSON.stringify(value)} ${unit}`, () => {
          const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit } }));
          expect(wrapper.text()).not.toContain('Below absolute zero');
        });
      });
  });

  describe('temperature unit cycling', () => {
    [['positive', ''], ['negative', '-']].forEach(([label, sign]) => {
      it(`keeps a finite ${label} temperature unchanged when conversion overflows`, () => {
        const value = `${sign}1${'0'.repeat(308)}`;
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }), onChange);
        expect(isEnvironmentNumber(value)).toBe(true);

        wrapper.find('button').at(0).simulate('click');

        expect(onChange.called).toBe(false);
        expect(wrapper.find('input').at(TEMPERATURE).prop('value')).toBe(value);
        expect(wrapper.find('button').at(0).text()).toBe('°C');
      });
    });

    [
      ['21,5', '70.7', '294.65'],
      ['-4,5', '23.9', '268.65'],
    ].forEach(([value, fahrenheit, kelvin]) => {
      it(`converts stored decimal-comma temperature ${value} and restores it on repeated cycles`, () => {
        const onChange = sinon.spy();
        const environment = buildEnvironment({ temperature: { value, unit: '°C' } });
        const wrapper = renderPanel(environment, onChange);

        const readings = [
          { value: fahrenheit, unit: '°F' },
          { value: kelvin, unit: 'K' },
          { value, unit: '°C' },
        ];
        [...readings, ...readings].forEach((temperature) => {
          wrapper.find('button').at(0).simulate('click');
          expect(onChange.lastCall.args[0]).toEqual({ ...environment, temperature });
          wrapper.setProps({ environment: onChange.lastCall.args[0] });
        });

        wrapper.unmount();
      });
    });

    it('keeps the reading and unit unchanged for nonnumeric stored temperature text', () => {
      ['21,5abc', '1,013.25', ',', '20-22', 'room temperature', 'NaN', 'Infinity'].forEach((value) => {
        const onChange = sinon.spy();
        const environment = buildEnvironment({ temperature: { value, unit: '°C' } });
        const wrapper = renderPanel(environment, onChange);
        wrapper.find('button').at(0).simulate('click');
        expect(onChange.called).toBe(false);
        expect(wrapper.prop('environment')).toEqual(environment);
        expect(wrapper.find('button').at(0).text()).toBe('°C');
        wrapper.unmount();
      });
    });

    it('changes units on an empty temperature field without introducing a value', () => {
      ['', '   '].forEach((value) => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }), onChange);
        wrapper.find('button').at(0).simulate('click');
        expect(onChange.lastCall.args[0].temperature).toEqual({ value, unit: '°F' });
        wrapper.unmount();
      });
    });

    it('cycles an imported temperature after trimming a supported unit label', () => {
      const onChange = sinon.spy();
      const unit = normalizeEnvironmentUnit('temperature', ' °F ');
      const wrapper = renderPanel(buildEnvironment({ temperature: { value: '32', unit } }), onChange);
      wrapper.find('button').at(0).simulate('click');

      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].temperature).toEqual({ value: '273.15', unit: 'K' });
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

    ['1000000000000000000000', '-1000000000000000000000'].forEach((value) => {
      it(`keeps large temperature ${value} numeric through a complete unit cycle`, () => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }), onChange);

        ENVIRONMENT_UNITS.temperature.forEach(() => {
          wrapper.find('button').at(0).simulate('click');
          const environment = onChange.lastCall.args[0];
          expect(isEnvironmentNumber(environment.temperature.value)).toBe(true);
          wrapper.setProps({ environment });
        });

        expect(wrapper.prop('environment').temperature).toEqual({ value, unit: '°C' });
        wrapper.unmount();
      });
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

    it('keeps the reading and unit unchanged for partially typed temperatures', () => {
      ['-', '.', '-.'].forEach((value) => {
        const onChange = sinon.spy();
        const wrapper = renderPanel(buildEnvironment({ temperature: { value, unit: '°C' } }), onChange);
        wrapper.find('button').at(0).simulate('click');
        expect(onChange.called).toBe(false);
        expect(wrapper.find('button').at(0).text()).toBe('°C');
        expect(wrapper.find('input').at(TEMPERATURE).prop('value')).toBe(value);
        wrapper.unmount();
      });
    });
  });

  describe('air pressure unit cycling', () => {
    const cyclePressure = (wrapper) => wrapper.find(PRESSURE_UNIT_BUTTON).simulate('click');

    [
      ['1013,25', '1'],
      ['0,00101325', '0.000001'],
    ].forEach(([value, atmospheres]) => {
      it(`converts stored decimal-comma pressure ${value} and restores it on repeated cycles`, () => {
        const onChange = sinon.spy();
        const environment = buildEnvironment({ air_pressure: { value, unit: 'mbar' } });
        const wrapper = renderPanel(environment, onChange);
        const unitCount = getGenSI('pressure').length;

        for (let cycle = 0; cycle < 2; cycle += 1) {
          cyclePressure(wrapper);
          expect(onChange.lastCall.args[0]).toEqual({
            ...environment, air_pressure: { value: atmospheres, unit: 'atm' },
          });
          wrapper.setProps({ environment: onChange.lastCall.args[0] });

          for (let step = 1; step < unitCount; step += 1) {
            cyclePressure(wrapper);
            wrapper.setProps({ environment: onChange.lastCall.args[0] });
          }
          expect(wrapper.prop('environment')).toEqual(environment);
        }

        wrapper.unmount();
      });
    });

    it('keeps the reading and unit unchanged for nonnumeric pressure text', () => {
      ['1013,25abc', '1,013.25', ',', '20-22', 'ambient', '-', '.', '-.', 'NaN', 'Infinity'].forEach((value) => {
        const onChange = sinon.spy();
        const environment = buildEnvironment({ air_pressure: { value, unit: 'mbar' } });
        const wrapper = renderPanel(environment, onChange);
        cyclePressure(wrapper);
        expect(onChange.called).toBe(false);
        expect(wrapper.prop('environment')).toEqual(environment);
        expect(wrapper.find(PRESSURE_UNIT_BUTTON).text()).toBe('mbar');
        wrapper.unmount();
      });
    });

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

    it('cycles through library unit keys, displays their labels, and restores the original precision', () => {
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
        const { label } = getGenSI('pressure').find(({ key }) => key === unit);
        expect(wrapper.find(PRESSURE_UNIT_BUTTON).text()).toBe(label);
      });
      expect(wrapper.prop('environment').air_pressure.value).toBe('1013.25789');
      wrapper.unmount();
    });

    it('preserves small pressure readings instead of rounding them to zero', () => {
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '0.00101325', unit: 'mbar' } }), onChange);
      cyclePressure(wrapper);
      expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '0.000001', unit: 'atm' });
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      for (let step = 1; step < getGenSI('pressure').length; step += 1) {
        cyclePressure(wrapper);
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
      }
      expect(wrapper.prop('environment').air_pressure).toEqual({ value: '0.00101325', unit: 'mbar' });
      wrapper.unmount();
    });

    it('cycles an imported pressure after normalizing its unit label', () => {
      const onChange = sinon.spy();
      const unit = normalizeEnvironmentUnit('air_pressure', 'hPa');
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit } }), onChange);
      cyclePressure(wrapper);

      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].air_pressure).toEqual({ value: '760', unit: 'torr' });
      wrapper.unmount();
    });

    it('converts MPa using its exact-case alias', () => {
      const onChange = sinon.spy();
      const unit = normalizeEnvironmentUnit('air_pressure', 'MPa');
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '14.7', unit } }), onChange);
      cyclePressure(wrapper);

      expect(onChange.calledOnce).toBe(true);
      expect(onChange.firstCall.args[0].air_pressure).toEqual({ value: '147000', unit: 'hpa' });
      wrapper.unmount();
    });

    it('converts once per click from the original measurement', () => {
      const convert = sinon.spy(MeasurementConversions, 'convertGenericUnit');
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } }), onChange);
      cyclePressure(wrapper);
      expect(convert.calledOnceWithExactly(1013.25, 'mbar', 'atm', 'pressure')).toBe(true);
      wrapper.setProps({ environment: onChange.lastCall.args[0] });
      cyclePressure(wrapper);

      expect(convert.callCount).toBe(2);
      expect(convert.secondCall.args).toEqual([1013.25, 'mbar', 'pa', 'pressure']);
      wrapper.unmount();
    });

    it('leaves the reading and unit unchanged when unit metadata is unavailable', () => {
      sinon.stub(MeasurementConversions, 'convertGenericUnit').returns(null);
      const onChange = sinon.spy();
      const wrapper = renderPanel(buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } }), onChange);
      cyclePressure(wrapper);

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
      expect(wrapper.find(PRESSURE_UNIT_BUTTON).getDOMNode().matches(':disabled')).toBe(true);
      wrapper.unmount();
    });
  });

  describe('pressure library metadata', () => {
    [undefined, null, []].forEach((units) => {
      it(`renders pressure read-only when the library returns ${JSON.stringify(units)}`, () => {
        const { Panel } = loadPanelWithPressureUnits(units);
        const onChange = sinon.spy();
        // An omitted unit still defaults to mbar, which is unavailable in this case.
        const environment = buildEnvironment({ air_pressure: { value: '42' } });
        const wrapper = mountComponent(<Panel open environment={environment} isDisabled={false} onChange={onChange} />);
        try {
          expect(wrapper.find('input').at(AIR_PRESSURE).prop('readOnly')).toBe(true);
          expect(wrapper.find(PRESSURE_UNIT_BUTTON).exists()).toBe(false);
          expect(wrapper.text()).toContain('mbar');
          changeInput(wrapper, AIR_PRESSURE, '25');
          expect(onChange.called).toBe(false);
        } finally {
          wrapper.unmount();
        }
      });
    });

    it('uses a newly supplied library unit for cycling, labels, aliases and conversion factors', () => {
      const units = [...getGenSI('pressure'), { key: 'test_pressure', label: 'Test pressure', nm: 10 }];
      const { Panel, normalizeEnvironmentUnit: normalizeAddedUnit } = loadPanelWithPressureUnits(units);
      const onChange = sinon.spy();
      const environment = buildEnvironment({ air_pressure: { value: '1013.25', unit: 'mbar' } });
      const wrapper = mountComponent(<Panel open environment={environment} isDisabled={false} onChange={onChange} />);
      try {
        wrapper.find(PRESSURE_UNIT_BUTTON).simulate('click');
        expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '10', unit: 'test_pressure' });
        wrapper.setProps({ environment: onChange.lastCall.args[0] });
        expect(wrapper.find(PRESSURE_UNIT_BUTTON).text()).toBe('Test pressure');
        expect(normalizeAddedUnit('air_pressure', 'Test pressure')).toBe('test_pressure');
        wrapper.find(PRESSURE_UNIT_BUTTON).simulate('click');
        expect(onChange.lastCall.args[0].air_pressure).toEqual({ value: '1', unit: 'atm' });
      } finally {
        wrapper.unmount();
      }
    });
  });

  it('links the toggle to the collapsible panel', () => {
    const wrapper = mountComponent(
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
