import React from 'react'
import {Panel , ButtonToolbar, Button, OverlayTrigger, Tooltip} from 'react-bootstrap'
import DeviceSampleContainer from './DeviceSampleContainer'
import ElementActions from './actions/ElementActions'
import DetailActions from './actions/DetailActions'
import AnalysisNMR from './AnalysisNMR'

const DeviceAnalysisDetails = ({analysis, toggleFullScreen}) => {
  return (
    <Panel
      className='panel-detail'
      bsStyle={analysis.isPendingToSave ? 'info' : 'primary'}
    >
      <Panel.Heading>
        {
          <Header
            analysis={analysis}
            toggleFullScreen={toggleFullScreen}
          />
        }
      </Panel.Heading>
      <Panel.Body>
        <MainContent
          analysis={analysis}
        />
      </Panel.Body>
    </Panel>
  )
}

export default DeviceAnalysisDetails

const Header = ({ analysis, toggleFullScreen }) => {
  return (
    <div>
      {analysis.title}
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="closeReaction">Close</Tooltip>}
      >
        <Button
          bsStyle="danger"
          bsSize="xsmall"
          className="button-right"
          onClick={() => DetailActions.close(analysis)}
        >
          <i className="fa fa-times" />
        </Button>
      </OverlayTrigger>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}
      >
        <Button
          bsStyle="info"
          bsSize="xsmall"
          className="button-right"
          onClick={() => toggleFullScreen()}
        >
          <i className="fa fa-expand" />
        </Button>
      </OverlayTrigger>
    </div>
  );
};

const MainContent = ({analysis}) => {
  switch(analysis.analysisType) {
    case 'NMR':
      return <AnalysisNMR analysis={analysis} />
      break
    default:
      return <div>Device-Analysis not found!</div>
  }
}
