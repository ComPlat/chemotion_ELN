import React, {Component} from 'react'
import connectToStores from 'alt-utils/lib/connectToStores'
import {
  PanelGroup, Panel, ButtonGroup, Button, Row, Col, ControlLabel, FormControl
} from 'react-bootstrap';
import ElementActions from './actions/ElementActions'
import UIActions from './actions/UIActions'
import ElementStore from './stores/ElementStore'
import UIStore from './stores/UIStore'

const DeviceManagement = ({devices, activeAccordionDevice}) => {
  const handleCloseDeviceManagement = () => {
    UIActions.closeDeviceManagement()
    const {currentCollection} = UIStore.getState()
    if( currentCollection == null || currentCollection.label == 'All' ) {
      Aviator.navigate(`/collection/all/${urlForCurrentElement()}`)
    } else {
      Aviator.navigate(`/collection/${currentCollection.id}/${urlForCurrentElement()}`)
    }
  }

  const urlForCurrentElement = () => {
    const {currentElement} = ElementStore.getState()
    if(currentElement) {
      if(currentElement.isNew) {
        return `${currentElement.type}/new`
      }
      else{
        return `${currentElement.type}/${currentElement.id}`
      }
    }
    else {
      return ''
    }
  }

  return (
    <div>
      <h1
        style={{margin: 0, float: "left"}}
      >
        Device-Management
      </h1>
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        style={{margin: "10px"}}
        onClick={() => handleCloseDeviceManagement()}
      >
        <i className="fa fa-times"></i>
      </Button>
      <AddDeviceButton
        activeAccordionDevice={activeAccordionDevice}
      />
      <Devices
        devices={devices}
        activeAccordionDevice={activeAccordionDevice}
      />
    </div>
  )
}

DeviceManagement.getStores = () => {
  return [ElementStore]
}

DeviceManagement.getPropsFromStores = () => {
  return ElementStore.getState().elements.devices
}

export default connectToStores(DeviceManagement)

const Devices = ({devices, activeAccordionDevice}) => {
  const styleByDeviceState = (device) => {
    return device.isNew || device.isEdited
      ? "info"
      : "default"
  }
  if(devices.length > 0) {
    return (
        <PanelGroup defaultActiveKey={0} activeKey={activeAccordionDevice} accordion>
          {devices.map(
            (device, key) =>
              <Panel
                eventKey={key}
                key={key}
                onClick={() => ElementActions.changeActiveAccordionDevice(key)}
                bsStyle={styleByDeviceState(device)}
              >
                <Panel.Heading>{<DeviceHeader device={device}/>}</Panel.Heading>
                <Panel.Body>
                  <Device
                    device={device}
                  />
                </Panel.Body>
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
    device.updateChecksum()
    ElementActions.saveDevice(device)
  }

  const handleChangeDeviceProp = (prop, value) => {
    ElementActions.changeDeviceProp(device, prop, value)
  }

  const bottomSpacer = {
    marginBottom: "10px"
  }

  return (
    <div>
      <ControlLabel>Title</ControlLabel>
      <FormControl
        type="text"
        value={device.title}
        placeholder="Enter device-title.."
        onChange={(e) => handleChangeDeviceProp("title", e.target.value)}
        style={bottomSpacer}
      />
      <ControlLabel>Code</ControlLabel>
      <FormControl
        type="text"
        value={device.code}
        placeholder="Enter device-code.."
        onChange={(e) => handleChangeDeviceProp("code", e.target.value)}
        style={bottomSpacer}
      />
      <ControlLabel>Types</ControlLabel><br/>
      <ButtonGroup
        style={bottomSpacer}
      >
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
      {device.title}
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
