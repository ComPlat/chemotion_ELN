import React from 'react';
import {
  Col, PanelGroup, Panel, FormControl, ControlLabel
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import CellLineName from 'src/apps/mydb/elements/details/cellLines/propertiesTab/CellLineName';

class GeneralProperties extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      openPanel: 'common-properties',
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
        const integerPositiveInput = Number.isInteger(defaultValue) && defaultValue > 0;
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
            value={defaultValue}
          />
        </Col>
      </div>
    );
  }

  renderBiosafetyLevel(item) {
    const { cellLineDetailsStore } = this.context;
    const options = [
      { value: 'S0', label: 'Biosafety level 0' },
      { value: 'S1', label: 'Biosafety level 1' },
      { value: 'S2', label: 'Biosafety level 2' },
      { value: 'S3', label: 'Biosafety level 3' }
    ];
    return (
      <div>
        <Col componentClass={ControlLabel} sm={3}>Biosavety level</Col>
        <Col sm={9}>
          <Select
            options={options}
            clearable={false}
            value={item.bioSafetyLevel}
            onChange={(e) => { cellLineDetailsStore.changeBioSafetyLevel(item.id, e.value); }}
          />
        </Col>
      </div>
    );
  }

  render() {
    const { item } = this.props;
    const { cellLineDetailsStore } = this.context;
    const cellLineItem = cellLineDetailsStore.cellLines(item.id);
    const cellLineId = item.id;
    const { openPanel } = this.state;

    return (
      <div>
        <div />
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

              <CellLineName id={cellLineId} name={cellLineItem.cellLineName} />
              {this.renderAttribute('Source *', cellLineItem.source, (e) => { cellLineDetailsStore.changeSource(cellLineId, e.target.value); })}

              {this.renderOptionalAttribute('Disease', cellLineItem.disease, (e) => { cellLineDetailsStore.changeDisease(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Organism', cellLineItem.organism, (e) => { cellLineDetailsStore.changeOrganism(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Tissue', cellLineItem.tissue, (e) => { cellLineDetailsStore.changeTissue(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('GrowthMedium', cellLineItem.growthMedium, (e) => { cellLineDetailsStore.changeGrowthMedium(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Mutation', cellLineItem.mutation, (e) => { cellLineDetailsStore.changeMutation(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Variant', cellLineItem.variant, (e) => { cellLineDetailsStore.changeVariant(cellLineId, e.target.value); })}
              {this.renderBiosafetyLevel(cellLineItem)}
              {this.renderOptionalAttribute(
                'Cryopreservation medium',
                cellLineItem.cryopreservationMedium,
                (e) => { cellLineDetailsStore.changeCryoMedium(cellLineId, e.target.value); }
              )}
              {this.renderOptionalAttribute('opt. growth temperature', cellLineItem.optimalGrowthTemperature, (e) => { cellLineDetailsStore.changeOptimalGrowthTemp(cellLineId, Number(e.target.value)); })}
              {this.renderOptionalAttribute('Gender', cellLineItem.gender, (e) => { cellLineDetailsStore.changeGender(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Cell type', cellLineItem.cellType, (e) => { cellLineDetailsStore.changeCellType(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Description', cellLineItem.materialDescription, (e) => { cellLineDetailsStore.changeMaterialDescription(cellLineId, e.target.value); })}
            </Panel.Body>
          </Panel>

          <Panel
            eventKey="specific-properties"
            key="specific-properties"
          >
            <Panel.Heading onClick={() => { this.setState({ openPanel: 'specific-properties' }); }}>Item specific properties</Panel.Heading>
            <Panel.Body collapsible>

              {this.renderAttribute('Amount *', cellLineItem.amount, (e) => { cellLineDetailsStore.changeAmount(cellLineId, Number(e.target.value)); }, false, true)}
              {this.renderAttribute('Passage *', cellLineItem.passage, (e) => { cellLineDetailsStore.changePassage(cellLineId, Number(e.target.value)); }, false, true)}
              {this.renderOptionalAttribute('Contamination', cellLineItem.contamination, (e) => { cellLineDetailsStore.changeContamination(cellLineId, e.target.value); })}              
              {this.renderOptionalAttribute('Name of specific probe', cellLineItem.itemName, (e) => { cellLineDetailsStore.changeItemName(cellLineId, e.target.value); })}
              {this.renderOptionalAttribute('Description', cellLineItem.itemDescription, (e) => { cellLineDetailsStore.changeItemDescription(cellLineId, e.target.value); })}
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
