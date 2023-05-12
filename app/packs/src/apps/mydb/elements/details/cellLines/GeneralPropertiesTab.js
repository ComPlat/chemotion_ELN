import React from 'react';
import {
  Col, PanelGroup, Panel, FormControl, ControlLabel
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

class GeneralPropertiesTab extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = { openPanel: 'common-properties' };
  }

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);
    const store = this.context.cellLineDetailsStore;
    const cellLineId=this.props.item.id;
    return (
      <div>
        <PanelGroup
          id={`cellLinePropertyPanelGroupOf:${cellLineItem.id}`}
          activeKey={this.state.openPanel}
          accordion
          onSelect={(e) => {}}
        >
          <Panel
            eventKey="common-properties"
            key="common-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'common-properties' }); }}>Common Properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Cell line name', cellLineItem.cellLineName,(e)=>{store.changeCellLineName(cellLineId, e.target.value)})}
              {this.renderAttribute('Mutation', cellLineItem.mutation,(e)=>{store.changeMutation(cellLineId, e.target.value)})}
              {this.renderAttribute('Disease', cellLineItem.disease,(e)=>{store.changeDisease(cellLineId, e.target.value)})}
              {this.renderAttribute('Organism', cellLineItem.organism,(e)=>{store.changeOrganism(cellLineId, e.target.value)})}
              {this.renderAttribute('Tissue', cellLineItem.tissue,(e)=>{store.changeTissue(cellLineId, e.target.value)})}
              {this.renderAttribute('Variant', cellLineItem.variant,(e)=>{store.changeVariant(cellLineId, e.target.value)})}
              {this.renderAttribute('Bio Savety Level', cellLineItem.biosafetyLevel,(e)=>{store.changeBioSafetyLevel(cellLineId, e.target.value)})}
              {this.renderAttribute('Cryopreservation medium', cellLineItem.cryopreservationMedium,(e)=>{store.changeCryoMedium(cellLineId, e.target.value)})}
            </Panel.Body>
          </Panel>

          <Panel
            eventKey="specific-properties"
            key="specific-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'specific-properties' }); }}>Item specific properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Amount', cellLineItem.amount,(e)=>{store.changeAmount(cellLineId, Number(e.target.value))})}
              {this.renderAttribute('Passage', cellLineItem.passage,(e)=>{store.changePassage(cellLineId, Number(e.target.value))})}
              {this.renderAttribute('Contamination', cellLineItem.contamination,(e)=>{store.changeContamination(cellLineId, e.target.value)})}
              {this.renderAttribute('Source', cellLineItem.source,(e)=>{store.changeSource(cellLineId, e.target.value)})}
              {this.renderAttribute('GrowthMedium', cellLineItem.growthMedium,(e)=>{store.changeGrowthMedium(cellLineId, e.target.value)})}
              {this.renderAttribute('Name of specific probe', cellLineItem.itemName,(e)=>{store.changeItemName(cellLineId, e.target.value)})}
            </Panel.Body>
          </Panel>
        </PanelGroup>

      </div>
    );
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

export default observer(GeneralPropertiesTab);
