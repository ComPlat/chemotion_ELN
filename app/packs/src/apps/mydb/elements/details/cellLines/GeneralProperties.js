import React from 'react';
import {
  Col, PanelGroup, Panel, FormControl, ControlLabel
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';

class GeneralProperties extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      openPanel: 'common-properties'
    };
  }

  renderOptionalAttribute(attributeName, defaultValue, onChangeCallBack) {
    return this.renderAttribute(attributeName, defaultValue, onChangeCallBack, true);
  }

  // eslint-disable-next-line class-methods-use-this
  renderAttribute(
    attributeName,
    defaultValue,
    onChangeCallBack,
    optional = false,
    numeric = false
  ) {
    let styleClass = '';
    if (!optional) {
      if (numeric) {
        const integerPositiveInput = Number.isInteger(defaultValue) && defaultValue >= 0;
        styleClass = integerPositiveInput ? '' : 'invalid-input';
      } else {
        const noInput = defaultValue.trim() === '';
        styleClass = noInput ? 'invalid-input' : '';
      }
    }

    return (
      <div>
        <Col componentClass={ControlLabel} sm={3}>{attributeName}</Col>
        <Col sm={9}>
          <FormControl
            className={styleClass}
            type="text"
            defaultValue={defaultValue}
            onChange={onChangeCallBack}
          />
        </Col>
      </div>
    );
  }

  render() {
    const { item } = this.props;
    // eslint-disable-next-line react/destructuring-assignment
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(item.id);
    // eslint-disable-next-line react/destructuring-assignment
    const store = this.context.cellLineDetailsStore;
    const cellLineId = item.id;
    const { openPanel } = this.state;

    return (
      <div>
        <PanelGroup
          class="cell-line-properties"
          id={`cellLinePropertyPanelGroupOf:${cellLineItem.id}`}
          activeKey={openPanel}
          accordion
          onSelect={() => {}}
        >
          <Panel
            eventKey="common-properties"
            key="common-properties"
          >
            <Panel.Heading onClick={() => { this.setState({ openPanel: 'common-properties' }); }}>Common Properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Cell line name *', cellLineItem.cellLineName, (e) => { store.changeCellLineName(cellLineId, e.target.value); })}
              {this.renderAttribute('Disease *', cellLineItem.disease, (e) => { store.changeDisease(cellLineId, e.target.value); })}
              {this.renderAttribute('Organism *', cellLineItem.organism, (e) => { store.changeOrganism(cellLineId, e.target.value); })}
              {this.renderAttribute('Tissue *', cellLineItem.tissue, (e) => { store.changeTissue(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Mutation', cellLineItem.mutation, (e) => { store.changeMutation(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Variant', cellLineItem.variant, (e) => { store.changeVariant(cellLineId, e.target.value); })}
              {this.renderAttribute('Bio Savety Level *', cellLineItem.bioSafetyLevel, (e) => { store.changeBioSafetyLevel(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Cryopreservation medium', cellLineItem.cryopreservationMedium, (e) => { store.changeCryoMedium(cellLineId, e.target.value); })}
            </Panel.Body>
          </Panel>

          <Panel
            eventKey="specific-properties"
            key="specific-properties"
          >
            <Panel.Heading onClick={() => { this.setState({ openPanel: 'specific-properties' }); }}>Item specific properties</Panel.Heading>
            <Panel.Body collapsible>
              {this.renderAttribute('Amount *', cellLineItem.amount, (e) => { store.changeAmount(cellLineId, Number(e.target.value)); }, false, true)}
              {this.renderAttribute('Passage *', cellLineItem.passage, (e) => { store.changePassage(cellLineId, Number(e.target.value)); }, false, true)}
              {this.renderOptionalAttribute('Contamination', cellLineItem.contamination, (e) => { store.changeContamination(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Source', cellLineItem.source, (e) => { store.changeSource(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('GrowthMedium', cellLineItem.growthMedium, (e) => { store.changeGrowthMedium(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Name of specific probe', cellLineItem.itemName, (e) => { store.changeItemName(cellLineId, e.target.value); })}
            </Panel.Body>
          </Panel>
        </PanelGroup>

      </div>
    );
  }
}

export default observer(GeneralProperties);

GeneralProperties.propTypes = {
  item: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired
  })).isRequired
};
