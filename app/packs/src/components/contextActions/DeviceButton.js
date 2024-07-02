import React from 'react';
import {ButtonGroup, Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';


const tooltip = <Tooltip id="device_button">Device-measurement</Tooltip>

const DeviceButton =() => {
  return (
    <OverlayTrigger placement="bottom" overlay={tooltip}>
      <ButtonGroup>
        <Button variant="light" onClick={ElementActions.showDeviceControl} >
          <i className="fa fa-bar-chart"/>
          <i className="fa fa-cogs"/>
        </Button>
      </ButtonGroup>
    </OverlayTrigger>
  )
}

export default DeviceButton
