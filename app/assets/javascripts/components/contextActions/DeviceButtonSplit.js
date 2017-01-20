import React from 'react'
import {ButtonGroup, OverlayTrigger, DropdownButton, Button, MenuItem} from 'react-bootstrap'
import UIActions from './../actions/UIActions'
import ElementStore from './../stores/ElementStore'

const DeviceButtonSplit = () => {
  const handleShowDeviceManagement = () => {
    UIActions.showDeviceManagement()
    Aviator.navigate('/device/management')
  }

  return (
  <ButtonGroup style={{marginLeft: '10px'}}>
    <OverlayTrigger placement="bottom" overlay={<DeviceTooltip/>}>
      <Button 
        bsStyle="warning"
        disabled={true}
        onClick={() => {}}
      >
        UI
      </Button>
      </OverlayTrigger>
      <DropdownButton
        bsStyle="warning"
        title={<DropdownButtonTitle/>}
        style={{width: "26px", paddingLeft: "8px"}}
        id="device-selection"
      >
        <MenuItem
          onSelect={() => handleShowDeviceManagement()}
        >
          Device Management
        </MenuItem>
        <MenuItem divider />
        <MenuItem
          onSelect={() => {}}
          className="selected"
        >
          Device 1
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 2
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
      </DropdownButton>
    </ButtonGroup>
  )
}

export default DeviceButtonSplit

const DeviceTooltip = () =>
  <Tooltip id="create_button">
    Open Device
  </Tooltip>

const DropdownButtonTitle = () =>
  <div></div>
