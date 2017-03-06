import React from 'react'
import {ButtonGroup, OverlayTrigger, Tooltip, DropdownButton, Button, MenuItem} from 'react-bootstrap'
import UIActions from './../actions/UIActions'
import ElementActions from './../actions/ElementActions'
import UserActions from './../actions/UserActions'
import ElementStore from './../stores/ElementStore'
import UserStore from './../stores/UserStore'
import UIStore from './../stores/UIStore'
import connectToStores from 'alt-utils/lib/connectToStores'

const DeviceButtonSplit = ({devices, selectedDeviceId}) => {
  const handleShowDeviceManagement = () => {
    UIActions.showDeviceManagement()
    Aviator.navigate('/device/management')
  }

  const handleOpenDevice = () => {
    UIActions.closeDeviceManagement()
    const {currentCollection} = UIStore.getState()
    // ending slash is needed!
    Aviator.navigate(`/collection/${currentCollection.id}/device/${selectedDeviceId}/`)
  }

  return (
    <ButtonGroup style={{marginLeft: '10px'}}>
      <OverlayTrigger 
        placement="bottom"
        overlay={<Tooltip id="open-device">Open Device</Tooltip>}
      >
        <Button 
          bsStyle="warning"
          disabled={selectedDeviceId === -1 || selectedDeviceId === null}
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
        {devices.length > 0 
          ? devices.map((device, key) => {
              return (
                <MenuItem
                  onSelect={() => ElementActions.changeSelectedDeviceId(device)}
                  className={device.id === selectedDeviceId ? "selected" : ""}
                  key={key}
                >
                  {device.title !== "" ? device.title : device.code}
                </MenuItem>
              )
            })
          : (
              <MenuItem
                disabled={true}
                key={'no-devices'}
              >
                No Devices created yet.
              </MenuItem>
          )
        }
      </DropdownButton>
    </ButtonGroup>
  )
}

DeviceButtonSplit.getStores = () => {
  // FIXME hacky
  const userStore = UserStore.getState()
  if (userStore && userStore.currentUser) {
    const {selected_device_id} = userStore.currentUser
    ElementActions.setSelectedDeviceId.defer(selected_device_id)
  }

  return [ElementStore]
}

DeviceButtonSplit.getPropsFromStores = () => {
  return ElementStore.getState().elements.devices
}

export default connectToStores(DeviceButtonSplit)

