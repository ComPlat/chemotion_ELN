/* eslint-disable react/require-default-props */
/* eslint-disable no-shadow */
import React, { useState, useEffect } from 'react';
import {
  FormControl, ControlLabel, InputGroup, Button
} from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function NumericInputUnit(props) {
  const {
    numericValue,
    unit,
    field,
    inputDisabled,
    label,
    onInputChange
  } = props;

  const [value, setValue] = useState(numericValue);
  const [currentUnit, setUnit] = useState(unit);

  useEffect(() => {
    setValue(numericValue);
    setUnit(unit);
  }, [numericValue, unit]);

  const weightConversion = (value, multiplier) => value * multiplier;
  const kelvinToCelsius = (value) => value - 273.15;
  const celsiusToFahrenheit = (value) => ((value * 9) / 5) + 32;
  const fahrenheitToKelvin = (value) => (((value - 32) * 5) / 9) + 273.15;

  const handleFloatNumbers = (number, decimalPlaces) => {
    const roundedValue = Math.round(Math.abs(number) * 10 ** decimalPlaces)
      / 10 ** decimalPlaces;
    return parseFloat(number < 0 ? -roundedValue : roundedValue);
  };

  const validateConversionForFlashPoint = (valueToFormat) => {
    let formattedValue = '';
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

  const validateConversionForInventoryAmount = (valueToFormat) => {
    const conversionMap = {
      g: { convertedUnit: 'mg', conversionFactor: 1000 },
      mg: { convertedUnit: 'μg', conversionFactor: 1000 },
      μg: { convertedUnit: 'g', conversionFactor: 0.000001 }
    };
    const { convertedUnit, conversionFactor } = conversionMap[currentUnit];
    const decimalPlaces = 7;
    const formattedValue = weightConversion(valueToFormat, conversionFactor);
    const convertedValue = handleFloatNumbers(formattedValue, decimalPlaces);
    return [convertedValue, convertedUnit];
  };

  const toggleInput = () => {
    let [convertedValue, convertedUnit] = [value, currentUnit];
    switch (field) {
      case 'inventory_amount':
        [convertedValue, convertedUnit] = validateConversionForInventoryAmount(value);
        break;
      case 'flash_point':
        [convertedValue, convertedUnit] = validateConversionForFlashPoint(value);
        break;
      default:
        // handle default case by doing no conversion
        convertedValue = parseFloat(value);
        break;
    }
    onInputChange(convertedValue, convertedUnit);
    setUnit(convertedUnit);
  };

  const handleInputValueChange = (event) => {
    const newInput = event.target.value;
    onInputChange(newInput, unit);
    setValue(newInput);
  };

  const labelWrap = label ? <ControlLabel>{label}</ControlLabel> : null;
  const bsSize = field === 'flash_point' ? 'small' : null;

  const unitSwitch = (
    <InputGroup.Button>
      <Button
        disabled={inputDisabled}
        active
        onClick={() => { toggleInput(); }}
        bsSize={bsSize}
      >
        {currentUnit}
      </Button>
    </InputGroup.Button>
  );

  return (
    <div className={`numericInputWithUnit_${unit}`}>
      {labelWrap}
      <InputGroup>
        <FormControl
          type="text"
          bsClass="bs-form--compact form-control"
          disabled={inputDisabled}
          bsSize={bsSize}
          value={value}
          onChange={(event) => handleInputValueChange(event)}
          name={field}
          label={label}
        />
        {unitSwitch}
      </InputGroup>
    </div>
  );
}

NumericInputUnit.propTypes = {
  onInputChange: PropTypes.func,
  unit: PropTypes.string,
  numericValue: PropTypes.number,
  label: PropTypes.node,
  field: PropTypes.string,
  inputDisabled: PropTypes.bool,
};
