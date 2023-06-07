import React from 'react';
import PropTypes from 'prop-types'
import { Panel, OverlayTrigger, Tooltip, Button, ButtonToolbar, Tabs, Tab } from 'react-bootstrap';
import Vessel from 'src/models/Vessel';
// import CopyElementModal from 'src/components/common/CopyElementModal'
import Immutable from 'immutable'
import UIStore from 'src/stores/alt/stores/UIStore';
// import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels'
import ConfirmClose from 'src/components/common/ConfirmClose';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import GenericPropertiesTab from 'src/apps/mydb/elements/details/vessels/GenericPropertiesTab'

class VesselDetails extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      vessel: props.vessel,
      visible: Immutable.List(),
      activeTab: "tab1"
    }
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
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
      <span><i className="icon-vessel" /></span>
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

  render() {
    const vessel = this.state.vessel || {};
    const { visible } = this.state;
    if (!this.props.vesselItem) { return (null); }
    this.context.vesselDetailsStore.convertVesselToModel(this.props.vesselItem);
    const item = this.props.vesselItem;

    return(
      <Panel
        className="eln-panel-detail"
        bsStyle={vessel.isPendingToSave ? 'info' : 'primary'}
      >
        <Panel.Heading>{this.vesselHeader()}</Panel.Heading>
        <Panel.Body>
          <Tabs activeKey={ this.state.activeTab} onSelect={event => this.handleTabChange(event)} id="vesselDetailsTab">
            <Tab eventKey="tab1" title="General Properties" key={"tab1"}>
              <GenericPropertiesTab item={item} />
            </Tab>
            <Tab eventKey="tab2" title="tab2" key={"tab2"}>Tab 2</Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary">
            Save
            </Button>
            <Button bsStyle="warning">
            Close
            </Button>                              
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    )
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }
  handleSegmentsChange(se) {
    
  }

  handleTabChange(eventKey) {
    this.setState({ activeTab:eventKey })
  }
}

export default observer(VesselDetails);