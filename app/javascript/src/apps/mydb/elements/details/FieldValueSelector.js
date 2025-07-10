import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { metPreConv } from 'src/utilities/metricPrefix';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

function FieldValueSelector({
  fieldOptions,
  value,
  onFieldChange,
  onChange,
  onFirstRenderField,
  disableSpecificField,
  disabled,
}) {
  const [selectedField, setSelectedField] = useState(onFirstRenderField || fieldOptions[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [displayValue, setDisplayValue] = useState('');

  const formatValue = (val) => {
    if ((Number.isNaN(val) || !Number.isFinite(val)) && parseFloat(val) !== 0) {
      return 'n.d.';
    }
    return metPreConv(val, 'n', 'n').toPrecision(4);
  };

  useEffect(() => {
    setSelectedField(onFirstRenderField);
    setInternalValue(value);
    setDisplayValue(formatValue(value));
  }, [onFirstRenderField, value]);

  const handleFieldChange = (field) => {
    setSelectedField(field);
    setShowDropdown(false);
    onFieldChange(field);
  };

  const validRange = (initialValidValue) => {
    const num = parseFloat(initialValidValue.toString().replace(',', '.'));
    if (!Number.isNaN(num) && num >= 0 && num <= 1) {
      return true;
    }
    return false;
  };

  const handleValueChange = (e) => {
    const val = e.target.value;
    // Allow only digits, commas, dots, and valid floats/integers
    const initialValidValue = val.replace(/[^0-9.,]/g, '');
    const validValue = validRange(initialValidValue);
    if (selectedField === 'weight percentage') {
      if (validValue || validValue === 0) {
        setInternalValue(initialValidValue);
      } else {
        NotificationActions.add({
          title: 'Invalid value',
          message: 'Please enter a number between 0 and 1.',
          level: 'error',
          position: 'tc'
        });
        setInternalValue('');
        return;
      }
    }
    if (!focused) {
      onChange(parseFloat(initialValidValue));
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setDisplayValue(internalValue);
  };

  const handleBlur = () => {
    setFocused(false);
    const formattedValue = formatValue(internalValue);
    setDisplayValue(formattedValue);
    onChange(parseFloat(internalValue));
  };

  let tooltipMessage = `Current field: ${selectedField}`;
  if (disableSpecificField) {
    if (selectedField === 'weight percentage') {
      tooltipMessage = 'select a reference product from products and assign target amount to enable '
        + 'weight percentage field';
    }
  }

  return (
    <div className="position-relative" style={{ zIndex: showDropdown ? 1050 : 'auto' }}>
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="field-selector-tooltip">
            {tooltipMessage}
          </Tooltip>
        )}
      >
        <Form.Control
          type="text"
          value={focused ? internalValue : displayValue}
          onChange={handleValueChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pe-5"
          style={{ border: selectedField === 'molar mass' ? '2px solid rgb(0, 123, 255)' : '2px solid rgb(0, 128, 0)' }}
          size="sm"
          disabled={disabled || disableSpecificField}
        />
      </OverlayTrigger>
      <Button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="position-absolute top-50 end-0 translate-middle-y px-2 border-0 bg-transparent text-dark"
        role="button"
        size="sm"
        disabled={disabled}
      >
        <i className="fa fa-caret-down" />
      </Button>
      {showDropdown && (
        <div className="position-absolute bg-white border w-100" style={{ top: '100%' }}>
          {fieldOptions.map((field) => (
            <Button
              key={field}
              onClick={() => handleFieldChange(field)}
              className={`px-2 text-decoration-none w-100 text-start ${
                field === selectedField ? 'bg-primary text-white' : 'bg-transparent text-dark'
              }`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleFieldChange(field);
                }
              }}
              aria-pressed={field === selectedField}
              variant="link"
              size="sm"
            >
              {field}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

FieldValueSelector.propTypes = {
  fieldOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onFirstRenderField: PropTypes.string,
  disableSpecificField: PropTypes.bool,
  disabled: PropTypes.bool,
  material: PropTypes.shape({
    equivalent: PropTypes.string,
    weight_percentage: PropTypes.string,
  }).isRequired,
};

FieldValueSelector.defaultProps = {
  onFirstRenderField: null,
  disableSpecificField: false,
  disabled: false,
};

export default FieldValueSelector;
