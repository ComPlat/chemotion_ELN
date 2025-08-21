import React, { useState, useEffect } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ToggleButton({
  isToggledInitial, onToggle, onChange, onLabel, offLabel,
  tooltipOn, tooltipOff, buttonTitleClass, buttonClass, variant
}) {
  const [isToggled, setIsToggled] = useState(isToggledInitial);

  const handleChange = () => {
    const newToggledState = !isToggled;
    setIsToggled(newToggledState);
    if (onToggle) onToggle(newToggledState);
    if (onChange) onChange(newToggledState);
  };

  useEffect(() => {
    setIsToggled(isToggledInitial);
  }, [isToggledInitial]);

  const toolTipMessage = isToggled ? tooltipOn : tooltipOff;

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="toggle-button-tooltip">{toolTipMessage}</Tooltip>}
    >
      <Button
        variant={variant}
        className={buttonClass}
        onClick={handleChange}
      >
        <span className={`fs-6 ${buttonTitleClass}`}>
          {isToggled ? onLabel : offLabel}
        </span>
      </Button>
    </OverlayTrigger>
  );
}

ToggleButton.propTypes = {
  isToggledInitial: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
  onChange: PropTypes.func,
  onLabel: PropTypes.string,
  offLabel: PropTypes.string,
  tooltipOn: PropTypes.string,
  tooltipOff: PropTypes.string,
  buttonTitleClass: PropTypes.string,
  buttonClass: PropTypes.string,
  variant: PropTypes.string,
};

ToggleButton.defaultProps = {
  onToggle: null,
  onChange: null,
  onLabel: 'On',
  offLabel: 'Off',
  tooltipOn: 'Click to switch off',
  tooltipOff: 'Click to switch on',
  buttonTitleClass: '',
  buttonClass: '',
  variant: 'outline-secondary',
};
