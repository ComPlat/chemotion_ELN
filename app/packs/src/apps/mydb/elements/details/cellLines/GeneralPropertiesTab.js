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
    this.changeAmount = this.changeAmount.bind(this);    
  }

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);

    return (
      <div>
        {cellLineItem.amount}
        <PanelGroup
          activeKey={this.state.openPanel}
          accordion
        >
          <Panel
            eventKey="common-properties"
            key="common-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'common-properties' }); }}>Common Properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Cell line name', cellLineItem.cellLineName)}
              {this.renderAttribute('Mutation', cellLineItem.mutation)}
              {this.renderAttribute('Disease', cellLineItem.disease)}
              {this.renderAttribute('Organism', cellLineItem.organism)}
              {this.renderAttribute('Tissue', cellLineItem.tissue)}
              {this.renderAttribute('Variant', cellLineItem.variant)}
              {this.renderAttribute('Bio Savety Level', cellLineItem.biosafetyLevel)}
              {this.renderAttribute('Cryopreservation medium', cellLineItem.cryopreservationMedium)}
            </Panel.Body>
          </Panel>

          <Panel
            eventKey="specific-properties"
            key="specific-properties"
          >
            <Panel.Heading onClick={(e) => { this.setState({ openPanel: 'specific-properties' }); }}>Item specific properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Amount', cellLineItem.amount, this.changeAmount)}
              {this.renderAttribute('Passage', cellLineItem.passage)}
              {this.renderAttribute('Contamination', cellLineItem.contamination)}
              {this.renderAttribute('Source', cellLineItem.source)}
              {this.renderAttribute('GrowthMedium', cellLineItem.growthMedium)}
              {this.renderAttribute('Name of specific probe', cellLineItem.itemName)}
            </Panel.Body>
          </Panel>
        </PanelGroup>

      </div>
    );
  }

  changeAmount(e){
    this.context.cellLineDetailsStore.changeAmountOfCellLine(this.props.item.id, Number(e.target.value));
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
          onChange={onChangeCallBack} />
        </Col>
      </div>
    );
  }
}

export default observer(GeneralPropertiesTab);
