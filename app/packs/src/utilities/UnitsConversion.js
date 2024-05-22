const handleFloatNumbers = (number, decimalPlaces) => {
  const roundedValue = Math.round(Math.abs(number) * 10 ** decimalPlaces)
    / 10 ** decimalPlaces;
  return parseFloat(number < 0 ? -roundedValue : roundedValue);
};

const convertTemperature = (valueToFormat, currentUnit) => {
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
    K: { convertedUnit: '°C', conversionFunc: kelvinToCelsius },
    '°C': { convertedUnit: '°F', conversionFunc: celsiusToFahrenheit },
    '°F': { convertedUnit: 'K', conversionFunc: fahrenheitToKelvin },
  };
  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  convertedValue = conversionFunc(formattedValue);
  formattedValue = formattedValue !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  convertedValue = `${formattedValue}${restOfString}`;
  return [convertedValue, convertedUnit];
};

const convertTime = (valueToFormat, currentUnit) => {
  const hourToMinute = (value) => value * 60;
  const minuteToSeconds = (value) => (value * 60);
  const secondsToHours = (value) => (value / 3600);
  const decimalPlaces = 4;

  const conversions = {
    h: { convertedUnit: 'm', conversionFunc: hourToMinute },
    m: { convertedUnit: 's', conversionFunc: minuteToSeconds },
    s: { convertedUnit: 'h', conversionFunc: secondsToHours },
  };

  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  const convertedValue = conversionFunc(valueToFormat);
  let formattedValue = valueToFormat !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  return [formattedValue, convertedUnit];
};

const convertTurnoverFrequency = (valueToFormat, currentUnit) => {
  const TONhourToMinute = (value) => value / 60;
  const TONMinuteToSecond = (value) => (value / 60);
  const TONSecondToHour = (value) => (value * 3600);
  const decimalPlaces = 4;

  const conversions = {
    'TON/h': { convertedUnit: 'TON/m', conversionFunc: TONhourToMinute },
    'TON/m': { convertedUnit: 'TON/s', conversionFunc: TONMinuteToSecond },
    'TON/s': { convertedUnit: 'TON/h', conversionFunc: TONSecondToHour },
  };

  const { convertedUnit, conversionFunc } = conversions[currentUnit];
  const convertedValue = conversionFunc(valueToFormat);
  let formattedValue = valueToFormat !== '' ? convertedValue : '';
  formattedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  return [formattedValue, convertedUnit];
};

export {
  // eslint-disable-next-line import/prefer-default-export
  convertTemperature,
  convertTime,
  convertTurnoverFrequency,
};
