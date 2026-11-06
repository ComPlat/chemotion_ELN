import { getGenSI } from 'chem-generic-ui';

export const convertTemperature = (temperature, fromUnit, toUnit) => {
  if (fromUnit === toUnit) {
    return temperature;
  }
  const conversionTable = {
    K: {
      '°C': (t) => parseFloat(t) - 273.15,
      '°F': (t) => (parseFloat(t) * 9 / 5) - 459.67
    },
    '°C': {
      K: (t) => parseFloat(t) + 273.15,
      '°F': (t) => (parseFloat(t) * 1.8) + 32
    },
    '°F': {
      K: (t) => (parseFloat(t) + 459.67) * 5 / 9,
      '°C': (t) => (parseFloat(t) - 32) / 1.8
    }
  };
  return conversionTable[fromUnit][toUnit](temperature);
};

export const convertGenericUnit = (value, fromUnit, toUnit, genericQuantity) => {
  const unitConfigs = getGenSI(genericQuantity);
  if (!unitConfigs || unitConfigs.length === 0) return null;

  const fromUnitConfig = unitConfigs.find((config) => config.key === fromUnit);
  const toUnitConfig = unitConfigs.find((config) => config.key === toUnit);
  if (!fromUnitConfig || !toUnitConfig) return null;

  return value * ((toUnitConfig.nm ?? 1) / (fromUnitConfig.nm ?? 1));
};
