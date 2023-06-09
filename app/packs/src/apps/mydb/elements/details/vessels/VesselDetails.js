import React from 'react';
import PropTypes from 'prop-types'
import { Panel, OverlayTrigger, Tooltip, Button, ButtonToolbar, Tabs, Tab } from 'react-bootstrap';
// import CopyElementModal from 'src/components/common/CopyElementModal'
import Immutable from 'immutable'
import UIStore from 'src/stores/alt/stores/UIStore';
// import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels'
import ConfirmClose from 'src/components/common/ConfirmClose';
import ElementActions from 'src/stores/alt/actions/ElementActions'
import DetailActions from 'src/stores/alt/actions/DetailActions';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import VesselPropertiesTab from 'src/apps/mydb/elements/details/vessels/VesselPropertiesTab'

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
    this.handleClose = this.handleClose.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  handleSubmit(vesselItem) {
    const mobXItem = this.context.vesselDetailsStore.vessels(this.props.vesselItem.id);
    vesselItem.adoptPropsFromMobxModel(mobXItem)
    
    ElementActions.updateVessel(vesselItem);
  }

  handleClose(vesselItem) {
    if (confirm('Unsaved data will be lost. Close vessel?')) {
      DetailActions.close(vesselItem, true);
    }
  }

  vesselHeader() {
    return(
    <div>
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
              <VesselPropertiesTab item={item} />
            </Tab>
            <Tab eventKey="tab2" title="tab2" key={"tab2"}>Tab 2</Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={(e) => {
              this.handleSubmit(this.props.vesselItem);
            }}>
            Save
            </Button>
            <Button bsStyle="warning" onClick={(e) => {
              this.handleClose(this.props.vesselItem);
            }}>
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