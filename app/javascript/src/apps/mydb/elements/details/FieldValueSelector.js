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

/**
 * FieldValueSelector Component
 *
 * A dual-purpose input component that allows users to:
 * 1. Select between different field types (e.g., 'molar mass' vs 'weight percentage')
 * 2. Enter and validate numeric values for the selected field type
 *
 * Key features:
 * - Dynamic field switching via dropdown
 * - Real-time validation (e.g., weight percentage must be between 0 and 1)
 * - Comma/dot decimal separator normalization
 * - Display formatting with precision control
 * - Conditional disabling based on reference material state
 *
 * @param {Object} props - Component properties
 * @param {string[]} props.fieldOptions - Array of available field types to choose from
 * @param {string} props.value - Initial/current numeric value
 * @param {Function} props.onFieldChange - Callback when field type changes (field) => void
 * @param {Function} props.onChange - Callback when value changes (numericValue) => void
 * @param {string} props.onFirstRenderField - Initial field type to display
 * @param {boolean} props.disableSpecificField - Disable input field
 * @param {boolean} props.disabled - Disable other (equivalent) field(s)
 * @param {boolean} props.weightPercentageReference - Whether sample is weight % reference
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The rendered component
 */
function FieldValueSelector({
  fieldOptions,
  value,
  onFieldChange,
  onChange,
  onFirstRenderField,
  disableSpecificField,
  disabled,
  weightPercentageReference,
  className,
}) {
  const [selectedField, setSelectedField] = useState(onFirstRenderField || fieldOptions[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [displayValue, setDisplayValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Formats a numeric value for display with 4 significant digits.
   * Normalizes comma decimal separators to dots before parsing.
   *
   * @param {string|number} val - The value to format
   * @returns {string} Formatted value or 'n.d.' if invalid
   */
  const formatValue = (val) => {
    const normalizedVal = val?.toString().replace(',', '.');
    const numValue = parseFloat(normalizedVal);
    if (!Number.isFinite(numValue)) {
      return 'n.d.';
    }
    return metPreConv(numValue, 'n', 'n').toPrecision(4);
  };

  useEffect(() => {
    setSelectedField(onFirstRenderField);
    setInternalValue(value);
    setDisplayValue(formatValue(value));
  }, [onFirstRenderField, value]);

  /**
   * Handles field type change (e.g., switching from 'molar mass' to 'weight percentage').
   * Closes the dropdown and notifies parent component.
   *
   * @param {string} field - The newly selected field type
   */
  const handleFieldChange = (field) => {
    setSelectedField(field);
    setShowDropdown(false);
    onFieldChange(field);
  };

  /**
   * Validates that a value is within the valid range for weight percentage (0 to 1).
   * Normalizes comma to dot before parsing.
   *
   * @param {string} initialValidValue - The value to validate
   * @returns {boolean} True if valid (between 0 and 1), false otherwise
   */
  const validRange = (initialValidValue) => {
    const num = parseFloat(initialValidValue.toString().replace(',', '.'));
    if (!Number.isNaN(num) && num >= 0 && num <= 1) {
      return true;
    }
    return false;
  };

  /**
   * Handles input value changes with validation.
   * - Strips non-numeric characters (except comma/dot)
   * - Validates weight percentage range (0-1)
   * - Shows error notification if invalid
   * - Updates internal state for editing
   *
   * @param {Event} e - The input change event
   */
  const handleValueChange = (e) => {
    const val = e.target.value;
    // Allow only digits, commas, dots, and valid floats/integers
    const initialValidValue = val.replace(/[^0-9.,]/g, '');
    const normalizedValue = initialValidValue.replace(',', '.');

    // Validate weight percentage range
    if (selectedField === 'weight percentage') {
      const isValid = validRange(initialValidValue);
      if (!isValid && normalizedValue !== '') {
        NotificationActions.add({
          title: 'Invalid value',
          message: 'Please enter a number between 0 and 1.',
          level: 'error',
          position: 'tc'
        });
        return;
      }
    }

    setInternalValue(normalizedValue);
    setDisplayValue(normalizedValue);
    setIsEditing(true);
  };

  /**
   * Handles blur event (user leaves the input field).
   * - Formats the value for display
   * - Calls parent onChange callback with parsed float value
   * - Exits editing mode
   */
  /**
   * Handles blur event (user leaves the input field).
   * - Formats the value for display
   * - Calls parent onChange callback with parsed float value
   * - Exits editing mode
   */
  const handleBlur = () => {
    if (isEditing && internalValue !== '') {
      // Round the normalized value to fix floating point precision issues
      const formattedValue = formatValue(internalValue);
      setDisplayValue(formattedValue);
      setIsEditing(false);
      onChange(parseFloat(formattedValue));
    } else {
      setIsEditing(false);
    }
  };

  /**
   * Handles focus event (user clicks into the input field).
   * Shows the raw internal value for editing rather than the formatted display value.
   */
  const handleFocus = () => {
    // When focusing, show the raw value for editing
    setDisplayValue(internalValue);
    setIsEditing(true);
  };

  let tooltipMessage = (
    <div>
      {`current: equiv. based on ${selectedField}`}
      {selectedField === 'weight percentage' && ' in decimal format (e.g.: 0.5 = 50%)'}
    </div>
  );

  if (disableSpecificField && selectedField === 'weight percentage') {
    if (weightPercentageReference) {
      tooltipMessage = (<div>weight percentage field is disabled for reference material</div>);
    } else {
      tooltipMessage = (
        <div>
          To use the weight percentage feature:
          <br />
          1- select a reference material (upon selection marked as green circle).
          <br />
          2- assign a target amount to this reference.
          <br />
          3- edit the weight percentage field and assign a value between 0 and 1 interval.
        </div>
      );
    }
  }

  return (
    <div className={`${className} position-relative`} style={{ zIndex: showDropdown ? 2200 : 'auto' }}>
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
          value={displayValue}
          onChange={handleValueChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pe-5"
          style={{ border: selectedField === 'molar mass' ? '2px solid rgb(0, 123, 255)' : '2px solid rgb(0, 128, 0)' }}
          size="sm"
          disabled={(disabled && selectedField === 'molar mass') || disableSpecificField}
        />
      </OverlayTrigger>
      <Button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="position-absolute top-50 end-0 translate-middle-y px-2 border-0 bg-transparent text-dark"
        role="button"
        size="sm"
        disabled={false}
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
  weightPercentageReference: PropTypes.bool,
  className: PropTypes.string,
};

FieldValueSelector.defaultProps = {
  onFirstRenderField: null,
  disableSpecificField: false,
  disabled: false,
  weightPercentageReference: false,
  className: '',
};

export default FieldValueSelector;
