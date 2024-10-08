/* eslint-disable react/require-default-props */
/* eslint-disable no-shadow */
import React, { useState, useEffect } from 'react';
import {
  FormControl, ControlLabel, InputGroup, Button
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
        [convertedValue, convertedUnit] = convertTemperature(value, currentUnit);
        break;
      default:
        // handle default case by doing no conversion
        convertedValue = parseFloat(value);
        break;
    }
    if (!Number.isNaN(convertedValue)) {
      onInputChange(convertedValue, convertedUnit);
      setUnit(convertedUnit);
    }
  };

  const handleInputValueChange = (event) => {
    const newInput = event.target.value;
    onInputChange(newInput, unit);
    setValue(newInput);
  };

  const labelWrap = label ? <ControlLabel>{label}</ControlLabel> : <ControlLabel style={{ paddingTop: '15px' }} />;
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
