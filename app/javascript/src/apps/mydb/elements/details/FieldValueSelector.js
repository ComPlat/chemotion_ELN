import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form, Button } from 'react-bootstrap';

function FieldValueSelector({
  fieldOptions,
  value,
  onFieldChange,
  onChange,
  onFirstRenderField,
  disabled,
}) {
  const [selectedField, setSelectedField] = useState(onFirstRenderField || fieldOptions[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (onFirstRenderField && onFirstRenderField !== selectedField) {
      setSelectedField(onFirstRenderField);
      // Update value based on the new field
      onChange(value || '');
    }
    console.log('selectedField:', selectedField);
    console.log('value:', value);
  }, [onFirstRenderField, value]);

  const handleFieldChange = (field) => {
    setSelectedField(field);
    setShowDropdown(false);
    onFieldChange(field);
    // Update value based on the new field
    onChange(value || '');
  };

  const handleValueChange = (e) => {
    const val = e.target.value;
    // Accept only digits
    if (/^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  return (
    <div className="position-relative" style={{ zIndex: showDropdown ? 1050 : 'auto' }}>
      <Form.Control
        type="text"
        value={value}
        onChange={handleValueChange}
        className="pe-5"
        size="sm"
        disabled={disabled}
      />
      <Button
        onClick={toggleDropdown}
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
  disabled: PropTypes.bool,
  material: PropTypes.shape({
    equivalent: PropTypes.string,
    weight_percentage: PropTypes.string
  }).isRequired
};

FieldValueSelector.defaultProps = {
  onFirstRenderField: null,
  disabled: false
};

export default FieldValueSelector;
