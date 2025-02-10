import React, { useState, useEffect } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function ToggleButton({
  isToggledInitial, onToggle, onChange, onLabel, offLabel,
  onColor, offColor, tooltipOn, tooltipOff, additionalClasses,
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

  const buttonColor = isToggled ? onColor : offColor;
  const toolTipMessage = isToggled ? tooltipOn : tooltipOff;

  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id="toggle-button-tooltip">{toolTipMessage}</Tooltip>}>
      <Button
        className={`bg-${buttonColor} border-0 p-0`}
        onClick={handleChange}
      >
        <span className={`fs-6 ${additionalClasses}`}>
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
  onColor: PropTypes.string,
  offColor: PropTypes.string,
  tooltipOn: PropTypes.string,
  tooltipOff: PropTypes.string,
  additionalClasses: PropTypes.string,
};

ToggleButton.defaultProps = {
  onToggle: null,
  onChange: null,
  onLabel: 'On',
  offLabel: 'Off',
  onColor: '#afcfee',
  offColor: '#d3d3d3',
  tooltipOn: 'Click to switch off',
  tooltipOff: 'Click to switch on',
  additionalClasses: '',
};
