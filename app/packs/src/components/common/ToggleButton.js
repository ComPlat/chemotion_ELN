import React, { useState } from 'react';
import {
  Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';

export default function ToggleButton({ gaseous, handleGaseousChange }) {
  const GasPhaseReactionState = GasPhaseReactionStore.getState();
  const [isToggled, setIsToggled] = useState(gaseous);

  const handleChange = () => {
    setIsToggled(!isToggled);
    GasPhaseReactionActions.handleGasButtonStatusChange();
    handleGaseousChange();
  };

  let buttonColor = '#d3d3d3';
  let toolTipMessage = 'click to enable gas mode, clicking gas mode will mark this reaction as a gaseous reaction';

  if (isToggled) {
    buttonColor = '#afcfee';
    toolTipMessage = 'click to enable Default mode';
  }

  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id="reaction-gas-mode">{toolTipMessage}</Tooltip>}>
      <Button
        className={`toggle-button ${isToggled ? 'on' : 'off'}`}
        bsSize="xs"
        onClick={handleChange}
        onChange={GasPhaseReactionState.handleGasButtonStatusChange}
        style={{ backgroundColor: buttonColor, minWidth: '50px', border: 'none' }}
      >
        <span style={{ fontSize: '13.5px' }}>{isToggled ? 'Gas Scheme' : 'Default Scheme'}</span>
      </Button>
    </OverlayTrigger>

  );
}

ToggleButton.propTypes = {
  gaseous: PropTypes.bool.isRequired,
  handleGaseousChange: PropTypes.func.isRequired

};
