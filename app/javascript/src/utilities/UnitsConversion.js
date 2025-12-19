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

const TEMPERATURE_UNITS = {
  KELVIN: 'K',
  FAHRENHEIT: '°F',
  CELSIUS: '°C'
};

const IDEAL_GAS_CONSTANT = 0.0821;
const PARTS_PER_MILLION_FACTOR = 1_000_000;
const DEFAULT_TEMPERATURE_IN_KELVIN = 294; // Assuming 21°C is used in the original formula

const handleFloatNumbers = (number, decimalPlaces) => {
  const numericValue = Number(number);
  if (Number.isNaN(numericValue)) return null;

  const roundedValue = Math.round(Math.abs(number) * 10 ** decimalPlaces)
    / 10 ** decimalPlaces;
  return parseFloat(number < 0 ? -roundedValue : roundedValue);
};

const convertTemperature = (valueToFormat, currentUnit) => {
  const numericValue = Number(valueToFormat);
  if (Number.isNaN(numericValue)) return null;

  const kelvinToCelsius = (value) => value - 273.15;
  const celsiusToFahrenheit = (value) => ((value * 9) / 5) + 32;
  const fahrenheitToKelvin = (value) => (((value - 32) * 5) / 9) + 273.15;

  let formattedValue = valueToFormat;
  let restOfString = '';
  let convertedValue;

  const decimalPlaces = 4;
  if (typeof valueToFormat === 'string') {
    const regex = /(-?\d+\.\d+|-?\d+)(.*)/;
    const match = valueToFormat.match(regex);
    if (match) {
      formattedValue = match[1];
      restOfString = ` ${match[2].trim()}` || '';
    }
  }
  const conversions = {
    K: { convertedUnit: TEMPERATURE_UNITS.CELSIUS, conversionFunc: kelvinToCelsius },
    '°K': { convertedUnit: TEMPERATURE_UNITS.CELSIUS, conversionFunc: kelvinToCelsius },
    '°C': { convertedUnit: TEMPERATURE_UNITS.FAHRENHEIT, conversionFunc: celsiusToFahrenheit },
    '°F': { convertedUnit: TEMPERATURE_UNITS.KELVIN, conversionFunc: fahrenheitToKelvin },
  };
  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  convertedValue = conversionFunc(formattedValue);
  formattedValue = formattedValue !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  convertedValue = `${formattedValue}${restOfString}`;
  return [convertedValue, convertedUnit];
};

const convertTemperatureToKelvin = (temperature) => {
  const { unit, value } = temperature || {};
  const temperatureValue = parseFloat(value);
  if (Number.isNaN(temperatureValue)) return null;

  switch (unit) {
    case TEMPERATURE_UNITS.FAHRENHEIT:
      return Math.abs((((temperatureValue - 32) * 5) / 9) + 273.15);
    case TEMPERATURE_UNITS.CELSIUS:
      return Math.abs(temperatureValue + 273.15);
    case TEMPERATURE_UNITS.KELVIN:
      return Math.abs(temperatureValue);
    default:
      throw new Error(`Unsupported temperature unit: ${unit}`);
  }
};

const hoursToMinutes = (value) => value * 60;
const hoursToSeconds = (value) => value * 3600;
const minutesToSeconds = (value) => (value * 60);
const minutesToHours = (value) => (value / 60);
const secondsToHours = (value) => (value / 3600);
const secondsToMinutes = (value) => (value / 60);

const convertTime = (valueToFormat, currentUnit) => {
  const numericValue = Number(valueToFormat);
  if (Number.isNaN(numericValue)) return null;
  const decimalPlaces = 4;
  const conversions = {
    h: { convertedUnit: TIME_UNITS.MINUTES, conversionFunc: hoursToMinutes },
    m: { convertedUnit: TIME_UNITS.SECONDS, conversionFunc: minutesToSeconds },
    s: { convertedUnit: TIME_UNITS.HOURS, conversionFunc: secondsToHours },
  };

  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  const convertedValue = conversionFunc(valueToFormat);
  let formattedValue = valueToFormat !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  return [formattedValue, convertedUnit];
};

const calculateFeedstockVolume = (amount, purity) => (
  amount * IDEAL_GAS_CONSTANT * DEFAULT_TEMPERATURE_IN_KELVIN
) / purity;

const calculateGasVolume = (molAmount, gasPhaseData) => {
  const { part_per_million: ppm, temperature } = gasPhaseData;
  const temperatureInKelvin = convertTemperatureToKelvin(temperature);

  if (!temperatureInKelvin || temperatureInKelvin <= 0 || !ppm || ppm <= 0) {
    return 0;
  }

  return (molAmount * IDEAL_GAS_CONSTANT * temperatureInKelvin);
};

const calculateMolesFromMoleculeWeight = (amountGram, molecularWeight) => (amountGram / molecularWeight);

const calculateGasMoles = (volume, ppm, temperatureInKelvin) => {
  if (!temperatureInKelvin || temperatureInKelvin <= 0) {
    return 0;
  }
  return (
    (ppm * volume) / (IDEAL_GAS_CONSTANT * temperatureInKelvin * PARTS_PER_MILLION_FACTOR)
  );
};

const calculateVolumeForFeedstockOrGas = (
  vesselVolume,
  purity,
  gasType,
  gasPhaseData,
  moles = null
) => {
  const { part_per_million, temperature } = gasPhaseData || {};
  const temperatureInKelvin = convertTemperatureToKelvin(temperature);
  let molAmount = moles;
  if (gasType === 'gas') {
    molAmount = calculateGasMoles(vesselVolume, part_per_million, temperatureInKelvin);
    return calculateGasVolume(molAmount, gasPhaseData);
  }
  return calculateFeedstockVolume(molAmount, purity);
};

const calculateFeedstockMoles = (volume, purity) => (volume * purity) / (
  IDEAL_GAS_CONSTANT * DEFAULT_TEMPERATURE_IN_KELVIN);

const updateFeedstockMoles = (purity, amountLiter, currentAmountLiter) => {
  const volume = amountLiter || currentAmountLiter;
  if (!volume) {
    return null;
  }

  const moles = calculateFeedstockMoles(volume, purity);
  return moles;
};

const calculateTON = (moles, moleOfCatalystReference) => {
  let value;
  if (!moleOfCatalystReference) {
    value = moleOfCatalystReference;
  } else {
    value = moles || moles === 0 ? moles / moleOfCatalystReference : null;
  }
  return value;
};

const calculateTONPerTimeValue = (timeValue, timeUnit) => {
  const numericValue = Number(timeValue);
  if (Number.isNaN(numericValue)) return null;

  switch (timeUnit) {
    case TIME_UNITS.SECONDS:
      return {
        hours: secondsToHours(timeValue),
        minutes: secondsToMinutes(timeValue),
        seconds: timeValue
      };
    case TIME_UNITS.MINUTES:
      return {
        hours: minutesToHours(timeValue),
        minutes: timeValue,
        seconds: minutesToSeconds(timeValue)
      };
    case TIME_UNITS.HOURS:
      return {
        hours: timeValue,
        minutes: hoursToMinutes(timeValue),
        seconds: hoursToSeconds(timeValue)
      };
    default:
      throw new Error(`Unsupported time unit: ${timeUnit}`);
  }
};

/**
 * Determine TON frequency value based on tonValue and a time resolution object.
 *
 * @param {number|string} tonValue - numeric TON value (may be string); returns null if missing/invalid.
 * @param {string} tonFrequencyUnit - one of TON_UNITS.
 * @param {object} timeValues - object with numeric fields { hours, minutes, seconds } (may be strings).
 * @param {number|null} defaultValue - fallback to return when time resolution is not available or zero.
 * @returns {number|null} - computed frequency or defaultValue, or null for invalid input.
 */
const determineTONFrequencyValue = (tonValue, tonFrequencyUnit, timeValues, defaultValue = null) => {
  // Validate / normalize tonValue
  if (tonValue === null || tonValue === undefined) return null; // undefined or null -> invalid input
  const ton = Number(tonValue);
  if (Number.isNaN(ton)) return null; // invalid numeric input
  if (ton === 0) return 0;

  // Safely normalize timeValues
  const tv = timeValues || {};
  const seconds = tv.seconds != null ? Number(tv.seconds) : null;
  const minutes = tv.minutes != null ? Number(tv.minutes) : null;
  const hours = tv.hours != null ? Number(tv.hours) : null;

  // Helper: safe division, returns defaultValue on invalid denominator
  const safeDiv = (denom) => (denom != null && !Number.isNaN(denom) && denom !== 0 ? ton / denom : defaultValue);

  switch (tonFrequencyUnit) {
    case TON_UNITS.PER_SECOND:
      return safeDiv(seconds);
    case TON_UNITS.PER_MINUTE:
      return safeDiv(minutes);
    case TON_UNITS.PER_HOUR:
      return safeDiv(hours);
    default:
      return defaultValue;
  }
};

const convertTurnoverFrequency = (valueToFormat, currentUnit) => {
  const numericValue = Number(valueToFormat);
  if (Number.isNaN(numericValue)) return null;

  const decimalPlaces = 4;

  const conversions = {
    'TON/h': { convertedUnit: TON_UNITS.PER_MINUTE, conversionFunc: hoursToMinutes },
    'TON/m': { convertedUnit: TON_UNITS.PER_SECOND, conversionFunc: minutesToSeconds },
    'TON/s': { convertedUnit: TON_UNITS.PER_HOUR, conversionFunc: secondsToHours },
  };

  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  const convertedValue = conversionFunc(valueToFormat);
  let formattedValue = valueToFormat !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  return [formattedValue, convertedUnit];
};

export {
  // eslint-disable-next-line import/prefer-default-export
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
};
