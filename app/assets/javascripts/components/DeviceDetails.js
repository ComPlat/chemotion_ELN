import React from 'react'
import {Panel , ButtonToolbar, Button, OverlayTrigger, Tooltip} from 'react-bootstrap'
import DeviceSampleContainer from './DeviceSampleContainer'
import ElementActions from './actions/ElementActions'

const DeviceDetails = ({device, closeDetails, toggleFullScreen}) => {
  console.log(device)
  return (
    <Panel
      className='panel-detail'
      header={<Header device={device} closeDetails={closeDetails} toggleFullScreen={toggleFullScreen}/>}
      bsStyle={device.isPendingToSave ? 'info' : 'primary'}
    >
      <DeviceSampleContainer
        device={device}
      />
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => closeDetails(device)}>
          Close
        </Button>
        <Button bsStyle="warning" onClick={() => handleSubmit(device)}>
          Save
        </Button>
      </ButtonToolbar>
    </Panel>
  )
}

export default DeviceDetails

const handleSubmit = (device) => {
  ElementActions.saveDevice(device)
}

const Header = ({device, closeDetails, toggleFullScreen}) => {
  return (
    <div>
      {device.title}
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="closeReaction">Close Device</Tooltip>}>
        <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => closeDetails(device)}>
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

