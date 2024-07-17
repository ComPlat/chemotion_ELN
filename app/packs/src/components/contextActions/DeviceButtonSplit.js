import React from 'react'
import { ButtonGroup, OverlayTrigger, Tooltip, DropdownButton, Button } from 'react-bootstrap'
import UIActions from 'src/stores/alt/actions/UIActions'
import ElementActions from 'src/stores/alt/actions/ElementActions'
import ElementStore from 'src/stores/alt/stores/ElementStore'
import UserStore from 'src/stores/alt/stores/UserStore'
import UIStore from 'src/stores/alt/stores/UIStore'
import connectToStores from 'alt-utils/lib/connectToStores'
import MenuItem from 'src/components/legacyBootstrap/MenuItem'

const DeviceButtonSplit = ({ devices, selectedDeviceId }) => {
  const handleShowDeviceManagement = () => {
    UIActions.showDeviceManagement()
    Aviator.navigate('/device/management')
  }

  const handleOpenDevice = () => {
    UIActions.closeDeviceManagement()
    const { currentCollection } = UIStore.getState()
    // ending slash is needed!
    Aviator.navigate(`/collection/${currentCollection.id}/device/${selectedDeviceId}/`)
  }

  return (
    <ButtonGroup style={{ marginLeft: '10px' }}>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="open-device">Open Device</Tooltip>}
      >
        <Button
          variant="warning"
          disabled={selectedDeviceId === -1 || selectedDeviceId === null}
          onClick={() => handleOpenDevice()}
        >
          UI
        </Button>
      </OverlayTrigger>
      <DropdownButton
        variant="warning"
        title={<div></div>}
        style={{ width: "26px", paddingLeft: "8px" }}
        id="device-selection"
      >
        <MenuItem
          onSelect={() => handleShowDeviceManagement()}
        >
          Device Management
        </MenuItem>
        <MenuItem divider />
        {devices && devices.length > 0
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
    const { selected_device_id } = userStore.currentUser
    ElementActions.setSelectedDeviceId.defer(selected_device_id)
  }

  return [ElementStore]
}

DeviceButtonSplit.getPropsFromStores = () => {
  return ElementStore.getState().elements.devices
}

export default connectToStores(DeviceButtonSplit)
