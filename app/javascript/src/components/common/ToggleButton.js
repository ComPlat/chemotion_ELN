import React, { useState } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

const ToggleButton = ({
  isToggledInitial, onToggle, onChange, onLabel, offLabel,
  tooltipOn, tooltipOff, buttonTitleClass, buttonClass, size, showIcon
}) => {
  const [isToggled, setIsToggled] = useState(isToggledInitial);
  const [prevIsToggledInitial, setPrevIsToggledInitial] = useState(isToggledInitial);

  if (isToggledInitial !== prevIsToggledInitial) {
    setPrevIsToggledInitial(isToggledInitial);
    setIsToggled(isToggledInitial);
  }

  const handleChange = () => {
    const newToggledState = !isToggled;
    setIsToggled(newToggledState);
    if (onToggle) onToggle(newToggledState);
    if (onChange) onChange(newToggledState);
  };

  const toolTipMessage = isToggled ? tooltipOn : tooltipOff;

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="toggle-button-tooltip">{toolTipMessage}</Tooltip>}
    >
      <Button
        variant="light"
        active={isToggled}
        className={buttonClass}
        onClick={handleChange}
        size={size}
      >
        <span className={`fs-6 ${buttonTitleClass}`}>
          {isToggled ? onLabel : offLabel}
          {showIcon && (
            <i className={`fa ${isToggled ? 'fa-circle' : 'fa-circle-thin'} ms-1`} aria-hidden="true" />
          )}
        </span>
      </Button>
    </OverlayTrigger>
  );
};

ToggleButton.propTypes = {
  isToggledInitial: PropTypes.bool.isRequired,
  onToggle: PropTypes.func,
  onChange: PropTypes.func,
  onLabel: PropTypes.string,
  offLabel: PropTypes.string,
  tooltipOn: PropTypes.node,
  tooltipOff: PropTypes.node,
  buttonTitleClass: PropTypes.string,
  buttonClass: PropTypes.string,
  size: PropTypes.string,
  showIcon: PropTypes.bool,
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
  size: 'sm',
  showIcon: false,
};

export default ToggleButton;
