import { describe, it } from 'mocha';
import assert from 'assert';

import {
  handleFloatNumbers,
  convertTemperature,
  convertTemperatureToKelvin,
  convertTime,
  calculateFeedstockVolume,
  calculateGasVolume,
  calculateMolesFromMoleculeWeight,
  calculateVolumeForFeedstockOrGas,
  calculateGasMoles,
  calculateFeedstockMoles,
  updateFeedstockMoles,
  calculateTON,
  calculateTONPerTimeValue,
  determineTONFrequencyValue,
  convertTurnoverFrequency,
} from '@src/utilities/UnitsConversion';

describe('Testing React Utility Functions', () => {
  const TEMPERATURE_UNITS = {
    KELVIN: 'K',
    FAHRENHEIT: '°F',
    CELSIUS: '°C'
  };

  const TIME_UNITS = {
    SECONDS: 's',
    MINUTES: 'm',
    HOURS: 'h'
  };

  const TON_UNITS = {
    PER_SECOND: 'TON/s',
    PER_MINUTE: 'TON/m',
    PER_HOUR: 'TON/h'
  };

  it('should handle float numbers correctly', () => {
    assert.strictEqual(handleFloatNumbers(1.23456, 2), 1.23);
    assert.strictEqual(handleFloatNumbers(-1.23456, 2), -1.23);
  });

  it('should convert temperature correctly', () => {
    const [converted, unit] = convertTemperature(300, TEMPERATURE_UNITS.KELVIN);
    assert.strictEqual(converted, '26.85');
    assert.strictEqual(unit, TEMPERATURE_UNITS.CELSIUS);
  });

  it('should convert temperature to Kelvin correctly', () => {
    assert.strictEqual(convertTemperatureToKelvin({ value: 32, unit: TEMPERATURE_UNITS.FAHRENHEIT }), 273.15);
    assert.strictEqual(convertTemperatureToKelvin({ value: 21, unit: TEMPERATURE_UNITS.CELSIUS }), 294.15);
  });

  it('should convert time correctly', () => {
    const [converted, unit] = convertTime(2, TIME_UNITS.HOURS);
    assert.strictEqual(converted, 120);
    assert.strictEqual(unit, TIME_UNITS.MINUTES);
  });

  it('should calculate feedstock volume correctly', () => {
    assert.strictEqual(calculateFeedstockVolume(2, 1), 48.274800000000006);
  });

  it('should calculate gas volume correctly', () => {
    const gasPhaseData = { part_per_million: 1000000, temperature: { value: 21, unit: TEMPERATURE_UNITS.CELSIUS } };
    assert.strictEqual(calculateGasVolume(2, gasPhaseData), 48.29943);
  });

  it('should calculate moles from molecule weight correctly', () => {
    assert.strictEqual(calculateMolesFromMoleculeWeight(10, 2), 5);
  });

  it('should calculate volume for feedstock or gas correctly', () => {
    const gasPhaseData = { part_per_million: 1000, temperature: { value: 21, unit: TEMPERATURE_UNITS.CELSIUS } };
    assert.strictEqual(calculateVolumeForFeedstockOrGas(10, 2, 0.5, 'gas', gasPhaseData), 120748.575);
    assert.strictEqual(calculateVolumeForFeedstockOrGas(10, 2, 0.5, 'feedstock', null), 241.37400000000002);
  });

  it('should calculate gas moles correctly', () => {
    assert.strictEqual(calculateGasMoles(10, 1000, 300), 0.00040600893219650826);
  });

  it('should calculate feedstock moles correctly', () => {
    assert.strictEqual(calculateFeedstockMoles(10, 0.5), 0.20714741438597362);
  });

  it('should update feedstock moles correctly', () => {
    assert.strictEqual(updateFeedstockMoles(10, 0.5, null), 0.20714741438597362);
  });

  it('should calculate TON correctly', () => {
    assert.strictEqual(calculateTON(10, 2), 5);
  });

  it('should calculate TON per time value correctly', () => {
    const result = calculateTONPerTimeValue(120, TIME_UNITS.MINUTES);
    assert.strictEqual(result.hours, 2);
    assert.strictEqual(result.minutes, 120);
    assert.strictEqual(result.seconds, 7200);
  });

  it('should determine TON frequency value correctly', () => {
    const timeValues = { hours: 2, minutes: 120, seconds: 7200 };
    assert.strictEqual(determineTONFrequencyValue(10, TON_UNITS.PER_HOUR, timeValues, 0), 5);
  });

  it('should convert turnover frequency correctly', () => {
    const [converted, unit] = convertTurnoverFrequency(2, TON_UNITS.PER_HOUR);
    assert.strictEqual(converted, 120);
    assert.strictEqual(unit, TON_UNITS.PER_MINUTE);
  });

  it('should handle float numbers with non-numeric precision/value', () => {
    const result = handleFloatNumbers('abc', 'abc');
    assert.strictEqual(result, null);
  });

  it('should return null for invalid temperature input', () => {
    const result = convertTemperature('abc', TEMPERATURE_UNITS.KELVIN);
    assert.strictEqual(result, null);
  });

  it('should return null for invalid temperature conversion to Kelvin', () => {
    assert.strictEqual(convertTemperatureToKelvin({ value: 'abc', unit: TEMPERATURE_UNITS.CELSIUS }), null);
  });

  it('should return null or handle invalid values for TON per time calculation', () => {
    const result = calculateTONPerTimeValue('abc', TIME_UNITS.MINUTES);
    assert.strictEqual(result, null);
  });

  it('should return null for invalid inputs for turnover frequency conversion', () => {
    const result = convertTurnoverFrequency('12,9', TON_UNITS.PER_HOUR);
    assert.strictEqual(result, null);
  });

  it('should handle invalid inputs for volume calculation for feedstock or gas', () => {
    const gasPhaseData = { part_per_million: 1000, temperature: { value: 'invalid', unit: TEMPERATURE_UNITS.CELSIUS } };
    assert.strictEqual(calculateVolumeForFeedstockOrGas(null, 2, 0.5, 'gas', gasPhaseData), 0);
  });
});
