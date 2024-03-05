import React from 'react'
import {Panel, PanelGroup , ButtonToolbar, Button, OverlayTrigger, Tooltip} from 'react-bootstrap'
import DeviceSampleContainer from './DeviceSampleContainer'
import ElementActions from './actions/ElementActions'
import DetailActions from './actions/DetailActions'
import DeviceManagement from './DeviceManagement'


const DeviceDetails = ({device, toggleFullScreen}) => {
  return (
    <Panel
      className='panel-detail'
      bsStyle={device.isPendingToSave ? 'info' : 'primary'}
    >
      <Panel.Heading>
        {<Header device={device} toggleFullScreen={toggleFullScreen}/>}
      </Panel.Heading>
      <Panel.Body>
      <PanelGroup  defaultActiveKey="0" accordion>
        <Panel eventKey="1">
          <Panel.Heading>
            <Panel.Title toggle>
              Device Management
            </Panel.Title>
          </Panel.Heading>
          <Panel.Body collapsible="true">
            <DeviceManagement />
          </Panel.Body>
        </Panel>
      </PanelGroup>

      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => DetailActions.close(device)}>
          Close
        </Button>
        <Button bsStyle="warning" onClick={() => handleSubmit(device)}>
          Save
        </Button>
      </ButtonToolbar>
      </Panel.Body>
    </Panel>
  )
}

export default DeviceDetails

const handleSubmit = (device) => {
  device.updateChecksum()
  ElementActions.saveDevice(device)
}

const Header = ({device, toggleFullScreen}) => {
  return (
    <div>
      {device.title}
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="closeReaction">Close Device</Tooltip>}>
        <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => DetailActions.close(device)}>
          <i className="fa fa-times"></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="saveReaction">Save Device</Tooltip>}>
        <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => handleSubmit(device)}>
          <i className="fa fa-floppy-o "></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
      <Button bsStyle="info" bsSize="xsmall" className="button-right"
        onClick={() => toggleFullScreen()}>
        <i className="fa fa-expand"></i>
      </Button>
      </OverlayTrigger>
    </div>
  )
}
