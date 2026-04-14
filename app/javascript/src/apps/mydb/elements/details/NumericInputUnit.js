/* eslint-disable react/require-default-props */
/* eslint-disable no-shadow */
import React, { useState, useEffect } from 'react';
import {
  InputGroup, Button, Form
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  convertTemperature,
  handleFloatNumbers,
} from 'src/utilities/UnitsConversion';

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
  const isValidNumber = (val) => (typeof val === 'string' || typeof val === 'number')
    && (!Number.isNaN(Number(val)) || val === '')
    && val !== null
    && val !== undefined;

  const conversionMap = {
    g: { convertedUnit: 'mg', conversionFactor: 1000 },
    mg: { convertedUnit: 'μg', conversionFactor: 1000 },
    μg: { convertedUnit: 'g', conversionFactor: 0.000001 },
    l: { convertedUnit: 'ml', conversionFactor: 1000 },
    ml: { convertedUnit: 'μl', conversionFactor: 1000 },
    μl: { convertedUnit: 'l', conversionFactor: 0.000001 }
  };

  const convertValue = (valueToFormat, currentUnit) => {
    const { convertedUnit, conversionFactor } = conversionMap[currentUnit];
    if (valueToFormat === '' || !isValidNumber(valueToFormat)) {
      return ['', convertedUnit];
    }
    const decimalPlaces = 7;
    const formattedValue = weightConversion(valueToFormat, conversionFactor);
    const convertedValue = handleFloatNumbers(formattedValue, decimalPlaces);
    return [convertedValue, convertedUnit];
  };

  const toggleInput = () => {
    let [convertedValue, convertedUnit] = [value, currentUnit];
    switch (field) {
      case 'chemical_amount_in_g':
      case 'chemical_amount_in_l':
        [convertedValue, convertedUnit] = convertValue(value, currentUnit);
        break;
      case 'flash_point':
      case 'storage_temperature':
        [convertedValue, convertedUnit] = convertTemperature(value, currentUnit);
        break;
      default:
        // handle default case by doing no conversion
        convertedValue = parseFloat(value);
        break;
    }
    // Check for invalid values (null, undefined, NaN)
    if (isValidNumber(convertedValue)) {
      onInputChange(convertedValue, convertedUnit);
      setUnit(convertedUnit);
    }
  };

  const handleInputValueChange = (event) => {
    const newInput = event.target.value;
    if (newInput.trim() === '') {
      onInputChange('', currentUnit);
      setValue('');
      return;
    }

    // Allow optional leading minus, digits, and at most one decimal point
    const isValidFormat = /^-?\d*\.?\d*$/.test(newInput);
    if (!isValidFormat) {
      return;
    }

    setValue(newInput);
    // Only propagate when there's at least one digit and the value is parseable
    if (/\d/.test(newInput)) {
      const parsedValue = parseFloat(newInput);
      if (!Number.isNaN(parsedValue)) {
        onInputChange(parsedValue, currentUnit);
      }
    }
  };

  return (
    <div className={`numericInputWithUnit_${currentUnit}`}>
      {label
        ? <Form.Label>{label}</Form.Label>
        : <Form.Label className="pt-2" />}
      <InputGroup>
        <Form.Control
          type="text"
          disabled={inputDisabled}
          value={value}
          onChange={(event) => handleInputValueChange(event)}
          name={field}
          label={label}
        />
        <Button
          disabled={inputDisabled}
          variant="light"
          onClick={toggleInput}
        >
          {currentUnit}
        </Button>
      </InputGroup>
    </div>
  );
}

NumericInputUnit.propTypes = {
  onInputChange: PropTypes.func,
  unit: PropTypes.string,
  numericValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.node,
  field: PropTypes.string,
  inputDisabled: PropTypes.bool,
};
