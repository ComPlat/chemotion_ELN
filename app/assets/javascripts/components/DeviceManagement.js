import React, {Component} from 'react'
import DeviceModel from './models/Device'
import {PanelGroup, Panel, ButtonGroup, Button, Row, Col} from 'react-bootstrap';

export default class DeviceManagement extends Component {
  constructor(props) {
    super()
    this.state = {
      devices: [],
      activeDevice: 0
    };
  }

  render() {
    return (
      <div>
        <h1>Devices</h1>
        <AddDeviceButton
          state={this.state}
          onChangeState={(state) => this.setState(state)}
        />
        <Devices
          state={this.state}
          onChangeState={(state) => this.setState(state)}
        />
      </div>
    )
  }
}

const Devices = ({state, onChangeState}) => {
  const {devices, activeDevice} = state

  const handleOpenAccordion = (key) => {
    state.activeDevice = key
    onChangeState(state)
  }

  if(devices.length > 0) {
    return (
        <PanelGroup defaultActiveKey={0} activeKey={activeDevice} accordion>
          {devices.map(
            (device, key) =>
              <Panel
                header={<DeviceHeader device={device} state={state} onChangeState={onChangeState}/>}
                eventKey={key}
                key={key}
                onClick={() => handleOpenAccordion(key)}
                style={{cursor: "pointer"}}
              >
                <Device
                  state={state}
                  device={device}
                  onChangeState={onChangeState}
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

const Device = ({device, state, onChangeState}) => {
  
  const styleBySelectedType = (type) => {
    return device.types.includes(type) 
      ? {background: "lightblue"}
      : {}
  }

  const handleTypeClick = (type) => {
    if (device.types.includes(type)) {
      device.types = device.types.filter((e) => e !== type)
    } else {
      device.types.push(type)
    }
    const deviceKey = state.devices.findIndex((e) => e.id === device.id)
    state.devices[deviceKey] = device
    onChangeState(state)
  }

  return (
    <div>
      <div
        style={{display: "inline-block", border: "1px solid lightblue", padding:"5px"}}
      >
        {device.code}
      </div>
      <ButtonGroup>
        <Button
          style={styleBySelectedType("NMR")}
          onClick={() => handleTypeClick("NMR")}
        >
          NMR
        </Button>
        <Button
          style={styleBySelectedType("EA")}
          onClick={() => handleTypeClick("EA")}
        >
          EA
        </Button>
        <Button
          style={styleBySelectedType("MS")}
          onClick={() => handleTypeClick("MS")}
        >
          MS
        </Button>
        <Button
          style={styleBySelectedType("IR")}
          onClick={() => handleTypeClick("IR")}
        >
          IR
        </Button>
      </ButtonGroup>
      <br/>
      <Button>Save</Button>
    </div>
  )
}

const DeviceHeader = ({device, state, onChangeState}) => {
  const handleRemoveDevice = () => {
    if(confirm('Delete the Device?')) {
      state.devices = state.devices.filter((e) => e.id !== device.id)
      onChangeState(state)
    }
  }

  return (
    <p style={{width: '100%'}}>
      {device.code}
      <Button 
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        onClick={() => handleRemoveDevice()}
      >
        <i className="fa fa-trash"></i>
      </Button>
    </p>
  )
}

const AddDeviceButton = (props) => {
  const handleAddDevice = ({state, onChangeState}) => {
    const {devices, activeDevice} = state
    const newDevice = DeviceModel.buildEmpty()
    const newKey = devices.length
    state.activeDevice = newKey
    state.devices.push(newDevice)
    onChangeState(state)
  }

  return (
    <p>
      &nbsp;
      <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => handleAddDevice(props)}>
        Add device
      </Button>
    </p>
  )
}

