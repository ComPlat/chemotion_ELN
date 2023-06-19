import React from 'react';
import PropTypes from 'prop-types'
import { Panel, OverlayTrigger, Tooltip, Button, ButtonToolbar, Tabs, Tab } from 'react-bootstrap';
import Immutable from 'immutable'
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
    if (vesselItem.is_new){
      DetailActions.close(vesselItem, true);
      ElementActions.createVessel(vesselItem);
    } else {
      ElementActions.updateVessel(vesselItem);
    }
    mobXItem.setChanged(false);
  }

  handleClose(vesselItem) {
    const { vesselDetailsStore } = this.context;
    const mobXItem = vesselDetailsStore.vessels(vesselItem.id);
    if (!mobXItem.changed || confirm('Unsaved data will be lost. Close vessel?')) {
      vesselDetailsStore.removeVesselFromStore(vesselItem.id);
      DetailActions.close(vesselItem, true);
    }
  }

  renderSaveButton(close = false) {
    const { vesselItem } = this.props;
    const { vesselDetailsStore } = this.context;
    const mobXItem = vesselDetailsStore.vessels(vesselItem.id);
    const disabled = !mobXItem.changed;
    if (disabled) { return null; }

    const action = close ? () =>  {
      this.handleSubmit(vesselItem);
      DetailActions.close(vesselItem, true);
    } : () => { this.handleSubmit(vesselItem); };

    const icons = close ? (
      <div>
        <i className="fa fa-floppy-o" />
        <i className="fa fa-times" />
      </div>
    ) : <i className="fa fa-floppy-o" />;

    const button = disabled ?
      (
        <Button disabled bsStyle="warning" bsSize="xsmall" className="button-right" onClick={action}>
          {icons}
        </Button>
      )
      : (
        <Button bsStyle="warning" bsSize="xsmall" className="button-right" onClick={action}>
          {icons}
        </Button>
      );

    return (button);
  }
  
  renderCloseHeaderButton() {
    const { vesselItem } = this.props;

    return (
      <Button
        bsStyle="danger"
        bsSize="xsmall"
        className="button-right"
        onClick={() => { this.handleClose(vesselItem); }}
      >
        <i className="fa fa-times" />
      </Button>
    );
  }

  renderFullScreenButton() {
    return(
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
      </OverlayTrigger>);
  }

  vesselHeader() {
    const { vesselItem } = this.props;
    const { vesselDetailsStore } = this.context;
    const mobXItem = vesselDetailsStore.vessels(this.props.vesselItem.id);

    let content = 'new Vessel';
    if (vesselItem.vesselTemplateName) {
      content = `${vesselItem.vesselTemplateName}`
    }
    if (vesselItem.vesselName) {
      content += ` - ${vesselItem.vesselName}`
    }
    if (mobXItem.changed) {
      return (
        <div>
          {content}
          {this.renderCloseHeaderButton()}
          {this.renderFullScreenButton()}
          {this.renderSaveButton()}
          {this.renderSaveButton(true)}
        </div>
        )
    }
    return (
    <div>
      {content}
      {this.renderCloseHeaderButton()}
      {this.renderFullScreenButton()}
    </div>
    )
  }

  renderSaveCloseButtons() {
    const { vesselItem } = this.props;
    const { vesselDetailsStore } = this.context;
    const mobXItem = vesselDetailsStore.vessels(this.props.vesselItem.id);
    const disabled = !mobXItem.changed;
    const buttonText = vesselItem.is_new ? 'Create' : 'Save';
    const disabledButton = <Button bsStyle="warning" disabled onClick={() => { this.handleSubmit(vesselItem); }}>{buttonText}</Button>;
    const enabledButton = <Button bsStyle="warning" onClick={() => { this.handleSubmit(vesselItem); }}>{buttonText}</Button>;
    const closeButton = <Button bsStyle="primary" onClick={(e) => { this.handleClose(this.props.vesselItem); }}>Close</Button>;

    if (disabled) {
      return (
        <ButtonToolbar>
          {disabledButton}
          {closeButton}
        </ButtonToolbar>
      );
    }
    return (
      <ButtonToolbar>
        {enabledButton}
        {closeButton}
      </ButtonToolbar>
    );
  }

  render() {
    const { vesselItem } = this.props;
    const { vesselDetailsStore } = this.context;
    vesselDetailsStore.convertVesselToModel(vesselItem);
    const mobXItem = vesselDetailsStore.vessels(vesselItem.id);
    
    if (!vesselItem) { return (null); }
    
    return(
      <Panel
        className="eln-panel-detail"
        bsStyle={mobXItem.changed ? 'info' : 'primary'}
      >
        <Panel.Heading>{this.vesselHeader()}</Panel.Heading>
        <Panel.Body>
          <Tabs activeKey={ this.state.activeTab} onSelect={event => this.handleTabChange(event)} id="vesselDetailsTab">
            <Tab eventKey="tab1" title="General Properties" key={"tab1"}>
              <VesselPropertiesTab item={vesselItem} />
            </Tab>
            <Tab eventKey="tab2" title="tab2" key={"tab2"}>Tab 2</Tab>
          </Tabs>
          {this.renderSaveCloseButtons()}                             
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