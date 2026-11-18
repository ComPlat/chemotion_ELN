/* eslint-disable react/require-default-props */
/* eslint-disable no-shadow */
import React, { useState, useEffect, useRef } from 'react';
import {
  InputGroup, Button, Form, Overlay, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  convertTemperature,
  handleFloatNumbers,
} from 'src/utilities/UnitsConversion';

// Accepts a comma as decimal separator, as typed on a German-locale keyboard.
const toNumber = (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val);
// Optional leading minus, digits, and at most one decimal point or comma.
const TYPED_NUMBER = /^-?\d*[.,]?\d*$/;
// "1,234" could be meant as a thousands separator, so say how it was read.
const LOOKS_LIKE_THOUSANDS = /^-?\d+,\d{3}$/;
const HINT_MS = 3000;

export default function NumericInputUnit(props) {
  const {
    numericValue,
    unit,
    field,
    inputDisabled,
    label,
    onInputChange
  } = props;

  const [typedValue, setTypedValue] = useState(numericValue ?? '');
  const [currentUnit, setUnit] = useState(unit);
  const [hint, setHint] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Keep the typed text (e.g. "2,5") while it still denotes the incoming number.
    setTypedValue((prev) => (toNumber(prev) === numericValue ? prev : (numericValue ?? '')));
    setUnit(unit);
  }, [numericValue, unit]);

  useEffect(() => {
    if (!hint) return undefined;
    const timer = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);

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
    let [convertedValue, convertedUnit] = [typedValue, currentUnit];
    switch (field) {
      case 'chemical_amount_in_g':
      case 'chemical_amount_in_l':
        [convertedValue, convertedUnit] = convertValue(toNumber(typedValue), currentUnit);
        break;
      case 'flash_point':
      case 'storage_temperature':
        // A string goes through as is: the helper parses the separator and keeps trailing text.
        [convertedValue, convertedUnit] = convertTemperature(typedValue, currentUnit);
        break;
      default:
        // handle default case by doing no conversion
        convertedValue = toNumber(typedValue);
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
    setHint(null);
    if (newInput.trim() === '') {
      onInputChange('', currentUnit);
      setTypedValue('');
      return;
    }

    if (!TYPED_NUMBER.test(newInput)) {
      return;
    }

    setTypedValue(newInput);
    // Only propagate when there's at least one digit and the value is parseable
    if (/\d/.test(newInput)) {
      const parsedValue = toNumber(newInput);
      if (!Number.isNaN(parsedValue)) {
        onInputChange(parsedValue, currentUnit);
      }
    }
  };

  // Show the number that was stored, so "1,000" reads back as "1"; keep the typed separator.
  const handleBlur = () => {
    if (typeof typedValue !== 'string' || typedValue === '' || !TYPED_NUMBER.test(typedValue)) return;
    const parsed = toNumber(typedValue);
    if (Number.isNaN(parsed)) {
      setTypedValue(numericValue ?? '');
      return;
    }
    const normalized = String(parsed);
    if (normalized.includes('e')) return;
    if (LOOKS_LIKE_THOUSANDS.test(typedValue)) setHint(`Read as ${normalized} ${currentUnit}`);
    setTypedValue(typedValue.includes(',') ? normalized.replace('.', ',') : normalized);
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
          value={typedValue}
          onChange={(event) => handleInputValueChange(event)}
          onBlur={handleBlur}
          ref={inputRef}
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
      <Overlay target={inputRef} show={!!hint} placement="bottom">
        <Tooltip id={`${field}-separator-hint`}>{hint}</Tooltip>
      </Overlay>
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
