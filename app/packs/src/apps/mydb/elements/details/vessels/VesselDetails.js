import React, { Component } from 'react';
import PropTypes from 'prop-types'
import { Panel, OverlayTrigger, Tooltip, Button, ButtonToolbar } from 'react-bootstrap';
import Vessel from 'src/models/Vessel';
// import CopyElementModal from 'src/components/common/CopyElementModal'
import Immutable from 'immutable'
import UIStore from 'src/stores/alt/stores/UIStore';
// import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels'
import ConfirmClose from 'src/components/common/ConfirmClose';
import DetailActions from 'src/stores/alt/actions/DetailActions';

export default class VesselDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      vessel: props.vessel,
      visible: Immutable.List(),
    }
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(closeView = true) {
    const vessel = this.state;
    if (closeView) {
      DetailActions.close(vessel, true)
    }
  }

  saveBtn(vessel, closeView = false) {
    let submitLabel = (vessel && vessel.isNew) ? 'Create' : 'Save';
    if (closeView) submitLabel += ' and close';

    return (
      <Button
        id="submit-vessel-btn"
        bsStyle="warning"
        onClick={() => this.handleSubmit(closeView)}
      >
        {submitLabel}
      </Button>
    );
  }

  vesselHeader() {
    const vessel = this.state;
    const saveBtnDisplay = vessel.isEdited ? '' : 'none';
    
    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false &&
      currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    return(
    <div>
      <span><i className="icon-vessel" />{vessel.vessel_name}</span>
      <ConfirmClose el={vessel} />
      <Button
        bsStyle="warning"
        bsSize="xsmall"
        className="button-right"
        onClick={() => this.handleSubmit()}
        // style={{ display: saveBtnDisplay }}
      >
        <i className="fa fa-floppy-o" />
        <i className="fa fa-times" />
      </Button>
      <Button
        bsStyle="warning"
        bsSize="xsmall"
        className="button-right"
        // style={{ display: saveBtnDisplay }}
        onClick={()=> this.handleSubmit(true)}
      >
        <i className="fa fa-floppy-o" />
      </Button>
      
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="fullVessel">Full Screen</Tooltip>}
      >
        <Button
          bsStyle="info"
          bsSize="xsmall"
          className="button-right"
          onClick={() => this.props.toggleFullScreen()}
        >
          <i className="fa fa-expand" />
        </Button>
      </OverlayTrigger>
    </div>);
  }

  render(){
    const vessel = this.state.vessel || {};
    const { visible } = this.state;
    return(
      <Panel
        className="eln-panel-detail"
        bsStyle={vessel.isPendingToSave ? 'info' : 'primary'}
      >
        <Panel.Heading>{this.vesselHeader()}</Panel.Heading>
        <Panel.Body>
          Placeholder for Vessel Details
        </Panel.Body>
      </Panel>
    )
  }
}

VesselDetails.propTypes = {
  vessel: PropTypes.object,
  toggleFullScreen: PropTypes.func,
}