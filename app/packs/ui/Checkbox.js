/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';

function Checkbox(props) {
  const {
    label, checked, onChange, disabled, tooltip, tooltipPosition, size, controlled, labelPlacement
  } = props;

  const checkboxClassNames = [
    'checkbox-common',
    `checkbox-${size}`,
    disabled ? 'checkbox-disabled' : '',
  ].join(' ');

  const wrapperClassNames = [
    'checkbox-wrapper',
    `checkbox-label-${labelPlacement}`,
  ].join(' ');

  return (
    <div className={wrapperClassNames}>
      {(labelPlacement === 'top' || labelPlacement === 'start') && label && <label>{label}</label>}
      {controlled ? (
        <input
          type="checkbox"
          className={checkboxClassNames}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <input
          type="checkbox"
          className={checkboxClassNames}
          defaultChecked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      )}
      {(labelPlacement === 'bottom' || labelPlacement === 'end') && label && <label>{label}</label>}
      {tooltip && (
        <span className={`checkbox-tooltip checkbox-tooltip-${tooltipPosition}`}>
          {tooltip}
        </span>
      )}
    </div>
  );
}

Checkbox.propTypes = {
  label: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  tooltip: PropTypes.string,
  tooltipPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xLarge']),
  controlled: PropTypes.bool,
  labelPlacement: PropTypes.oneOf(['top', 'bottom', 'start', 'end']),
};

Checkbox.defaultProps = {
  label: '',
  checked: false,
  onChange: () => {},
  disabled: false,
  tooltip: null,
  tooltipPosition: 'top',
  size: 'medium',
  controlled: true,
  labelPlacement: 'end',
};

export default Checkbox;
