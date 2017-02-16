import React from 'react'
import {Panel , ButtonToolbar, Button, OverlayTrigger, Tooltip} from 'react-bootstrap'
import DeviceSampleContainer from './DeviceSampleContainer'
import ElementActions from './actions/ElementActions'
import AnalysisNMR from './AnalysisNMR'

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
      bsStyle={analysis.isPendingToSave ? 'info' : 'primary'}
    >
      <MainContent
        analysis={analysis}
        closeDetails={closeDetails}
      />
    </Panel>
  )
}

export default DeviceAnalysisDetails

const Header = ({analysis, closeDetails, toggleFullScreen}) => {
  return (
    <div>
      {`${analysis.analysisType} Analysis: ${analysis.title}`}
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="closeReaction">Close</Tooltip>}>
        <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => closeDetails(analysis)}>
          <i className="fa fa-times"></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="saveReaction">Save</Tooltip>}>
        <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => handleSubmit(analysis)}>
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
    case 'NMR':
      return <AnalysisNMR analysis={analysis}/>
      break
    default:
      return <div>Device-Analysis not found!</div>
  }
}
