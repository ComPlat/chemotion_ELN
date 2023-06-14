import React from 'react';
import {
 Col, Panel, FormControl, ControlLabel, PanelGroup
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

class VesselPropertiesTab extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = { openPanel: 'common-properties' };
  }
  
  render() {
    const vesselId = this.props.item.id;
    const { vesselDetailsStore } = this.context;
    const vesselItem = vesselDetailsStore.vessels(vesselId)

    return (
      <div>
        <PanelGroup
          activeKey={this.state.openPanel}
          accordion
        >
          <Panel
          eventKey="common-properties"
          key="common-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'common-properties' }) }}>Common Properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Vessel Template Name', vesselItem.vesselTemplateName, (e)=>{vesselDetailsStore.changeTemplateName(vesselId, e.target.value)})}
              {this.renderAttribute('Vessel Type', vesselItem.vesselType, (e)=>{vesselDetailsStore.changeType(vesselId, e.target.value)})}
              {this.renderAttribute('Vessel Details', vesselItem.vesselDetails, (e)=>{vesselDetailsStore.changeDetails(vesselId, e.target.value)})}
              {this.renderAttribute('Volume Amount', vesselItem.volumeAmount, (e)=>{vesselDetailsStore.changeVolumeAmount(vesselId, e.target.value)})}
              {this.renderAttribute('Volume Unit', vesselItem.volumeUnit, (e)=>{vesselDetailsStore.changeVolumeUnit(vesselId, e.target.value)})}
              {this.renderAttribute('Material', vesselItem.materialType, (e)=>{vesselDetailsStore.changeMaterialType(vesselId, e.target.value)})}
              {this.renderAttribute('Material Details', vesselItem.materialDetails, (e)=>{vesselDetailsStore.changeMaterialDetails(vesselId, e.target.value)})}
            </Panel.Body>
          </Panel>

          <Panel
            eventKey="specific-properties"
            key="specific-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'specific-properties' }) }}>Specific Properties</Panel.Heading>
            <Panel.Body collapsible>
            {this.renderAttribute('Name', vesselItem.vesselName, (e)=>{vesselDetailsStore.changeName(vesselId, e.target.value)})}
            {this.renderAttribute('Description', vesselItem.vesselDescription, (e)=>{vesselDetailsStore.changeDescription(vesselId, e.target.value)})}
            </Panel.Body>
          </Panel>
      </PanelGroup>
      </div>
      
    )
  }

  renderAttribute(attributeName, defaultValue, onChangeCallBack) {
    return (
      <div>
        <Col componentClass={ControlLabel} sm={3}>{attributeName}</Col>
        <Col sm={9}>
          <FormControl
            type="text"
            name="XXX"
            defaultValue={defaultValue}
            onChange={onChangeCallBack}
          />
        </Col>
      </div>
    );
  }
}

export default observer(VesselPropertiesTab);