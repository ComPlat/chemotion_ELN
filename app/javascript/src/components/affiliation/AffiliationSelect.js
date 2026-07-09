import React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'src/components/common/Select';

// Shared dropdown for the department and working-group columns.
// Options are passed in by the parent (org-scoped); no inline creation —
// new values go through the suggestion popover instead.
function AffiliationSelect({
  value, options, onChange, disabled, placeholder,
}) {
  return (
    <Select
      isClearable
      isDisabled={disabled}
      placeholder={placeholder}
      options={options}
      value={value ? { value, label: value } : null}
      onChange={(choice) => onChange(choice ? choice.value : '')}
      styles={{ menu: (base) => ({ ...base, width: '100%', minWidth: 'unset' }) }}
    />
  );
}

AffiliationSelect.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
};

AffiliationSelect.defaultProps = {
  value: '',
  options: [],
  disabled: false,
  placeholder: 'Select...',
};

export default AffiliationSelect;
