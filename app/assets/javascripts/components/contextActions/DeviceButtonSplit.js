import React from 'react'
import {ButtonGroup, OverlayTrigger, Tooltip, DropdownButton, Button, MenuItem} from 'react-bootstrap'
import UIActions from './../actions/UIActions'
import ElementActions from './../actions/ElementActions'
import ElementStore from './../stores/ElementStore'
import connectToStores from 'alt-utils/lib/connectToStores'

const DeviceButtonSplit = ({devices, selectedDeviceId}) => {
  const handleShowDeviceManagement = () => {
    UIActions.showDeviceManagement()
    Aviator.navigate('/device/management')
  }

  const handleOpenDevice = () => {
    UIActions.closeDeviceManagement()
    Aviator.navigate(`/device/${selectedDeviceId}`)
  }

  return (
    <ButtonGroup style={{marginLeft: '10px'}}>
      <OverlayTrigger 
        placement="bottom"
        overlay={<Tooltip id="open-device">Open Device</Tooltip>}
      >
        <Button 
          bsStyle="warning"
          disabled={selectedDeviceId === -1}
          onClick={() => handleOpenDevice()}
        >
          UI
        </Button>
      </OverlayTrigger>
      <DropdownButton
        bsStyle="warning"
        title={<div></div>}
        style={{width: "26px", paddingLeft: "8px"}}
        id="device-selection"
      >
        <MenuItem
          onSelect={() => handleShowDeviceManagement()}
        >
          Device Management
        </MenuItem>
        <MenuItem divider />
        {devices.map((device) => {
          return (
            <MenuItem
              onSelect={() => ElementActions.changeSelectedDeviceId(device.id)}
              className={device.id === selectedDeviceId ? "selected" : ""}
              key={device.id}
            >
              {device.code}
            </MenuItem>
          )
        })}
      </DropdownButton>
    </ButtonGroup>
  )
}

DeviceButtonSplit.getStores = () => {
  return [ElementStore]
}

DeviceButtonSplit.getPropsFromStores = () => {
  return ElementStore.getState().elements.devices
}

export default connectToStores(DeviceButtonSplit)

