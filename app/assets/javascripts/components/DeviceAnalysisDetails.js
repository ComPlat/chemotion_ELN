import React from 'react'
import {Panel , ButtonToolbar, Button, OverlayTrigger, Tooltip} from 'react-bootstrap'
import DeviceSampleContainer from './DeviceSampleContainer'
import ElementActions from './actions/ElementActions'

const DeviceAnalysisDetails = ({analysis, closeDetails, toggleFullScreen}) => {
  return (
    <Panel
      className='panel-detail'
      header={
        <Header 
          analysis={analysis}
          closeDetails={closeDetails}
          toggleFullScreen={toggleFullScreen}
        />
      }
      bsStyle={device.isPendingToSave ? 'info' : 'primary'}
    >
      <MainContent analysis={analysis}/>
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

export default DeviceAnalysisDetails

const handleSubmit = (device) => {
  // device.updateChecksum()
  ElementActions.saveDeviceAnalysis(device)
}

const Header = ({analysis, closeDetails, toggleFullScreen}) => {
  return (
    <div>
      {`${analysis.analysisType} Analysis: Device-Sample`}
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="closeReaction">Close</Tooltip>}>
        <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => closeDetails(device)}>
          <i className="fa fa-times"></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="saveReaction">Save</Tooltip>}>
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

const MainContent = ({analysis}) => {
  switch(analysis.analysisType) {
    case 'nmr':
      return <AnalysisNMR analysis={analysis}/>
      break
    default:
      return <div>Device-Analysis not found!</div>
  }
}
