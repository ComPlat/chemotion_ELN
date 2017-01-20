import React, {Component} from 'react'
import connectToStores from 'alt-utils/lib/connectToStores'
import {PanelGroup, Panel, ButtonGroup, Button, Row, Col} from 'react-bootstrap';
import ElementActions from './actions/ElementActions'
import ElementStore from './stores/ElementStore'

const DeviceManagement = ({devices, activeDevice}) => {
  return (
    <div>
      <h1>Devices</h1>
      <AddDeviceButton
        activeDevice={activeDevice}
      />
      <Devices
        devices={devices}
        activeDevice={activeDevice}
      />
    </div>
  )
}  

DeviceManagement.getStores = () => {
  ElementActions.fetchAllDevices()
  return [ElementStore]
}

DeviceManagement.getPropsFromStores = () => {
  return ElementStore.getState().elements.devices
}

export default connectToStores(DeviceManagement)

const Devices = ({devices, activeDevice}) => {
  const styleByDeviceState = (device) => {
    console.log(device)
    return device.isNew || device.isEdited
      ? "info" 
      : "default"
  }
  if(devices.length > 0) {
    return (
        <PanelGroup defaultActiveKey={0} activeKey={activeDevice} accordion>
          {devices.map(
            (device, key) =>
              <Panel
                header={<DeviceHeader device={device}/>}
                eventKey={key}
                key={key}
                onClick={() => ElementActions.changeActiveDevice(key)}
                bsStyle={styleByDeviceState(device)}
              >
                <Device
                  device={device}
                />
              </Panel>
          )}
        </PanelGroup>
    )
  } else {
    return (
        <p>
          There are currently no Devices.
        </p>
    )
  }
}

const Device = ({device}) => {
  const styleBySelectedType = (type) => {
    return device.types.includes(type) 
      ? "primary"
      : "default"
  }

  const handleTypeClick = (type) => {
    ElementActions.toggleDeviceType(device, type)
  }

  const handleSave = () => {
    ElementActions.saveDevice(device)
  }

  return (
    <div>
      <div
        style={{
          display: "inline-block",
          border: "1px solid #ddd",
          padding:"6px",
          borderRadius: "4px",
          marginRight: "5px",
          verticalAlign: "middle"
        }}
      >
        {device.code}
      </div>
      <ButtonGroup>
        <Button
          bsStyle={styleBySelectedType("NMR")}
          onClick={() => handleTypeClick("NMR")}
        >
          NMR
        </Button>
        <Button
          bsStyle={styleBySelectedType("EA")}
          onClick={() => handleTypeClick("EA")}
        >
          EA
        </Button>
        <Button
          bsStyle={styleBySelectedType("MS")}
          onClick={() => handleTypeClick("MS")}
        >
          MS
        </Button>
        <Button
          bsStyle={styleBySelectedType("IR")}
          onClick={() => handleTypeClick("IR")}
        >
          IR
        </Button>
      </ButtonGroup>
      <br/>
      <Button
        style={{marginTop: "5px"}}
        onClick={(e) => handleSave()}
      >
        Save
      </Button>
    </div>
  )
}

const DeviceHeader = ({device, state, onChangeState}) => {
  const handleRemoveDevice = (e) => {
    if(confirm('Delete the Device?')) {
      ElementActions.deleteDevice(device)
    }
    e.preventDefault()
  }

  return (
    <div style={{
      width: '100%',
      cursor: "pointer"
    }}>
      {device.code}
      <Button 
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        onClick={(e) => handleRemoveDevice(e)}
      >
        <i className="fa fa-trash"></i>
      </Button>
    </div>
  )
}

const AddDeviceButton = () => {
  return (
    <p>
      &nbsp;
      <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => ElementActions.createDevice()}>
        Add device
      </Button>
    </p>
  )
}

