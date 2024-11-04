import React from 'react';
import {
  Accordion, Col, Row, Form
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Select, CreatableSelect } from 'src/components/common/Select';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import CellLineName from 'src/apps/mydb/elements/details/cellLines/propertiesTab/CellLineName';
import Amount from 'src/apps/mydb/elements/details/cellLines/propertiesTab/Amount';
import InvalidPropertyWarning from 'src/apps/mydb/elements/details/cellLines/propertiesTab/InvalidPropertyWarning';

class GeneralProperties extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

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
    const { readOnly } = this.props;

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
      <Form.Group as={Row} className="mt-3">
        <Form.Label column sm={3}>{attributeName}</Form.Label>
        <Col sm={9}>
          <Form.Control
            disabled={readOnly}
            className={styleClass}
            type="text"
            value={defaultValue}
            onChange={onChangeCallBack}
          />
        </Col>
      </Form.Group>
    );
  }

  renderBiosafetyLevel(item) {
    const { readOnly } = this.props;

    const { cellLineDetailsStore } = this.context;
    const options = [
      { value: 'S0', label: 'Biosafety level 0' },
      { value: 'S1', label: 'Biosafety level 1' },
      { value: 'S2', label: 'Biosafety level 2' },
      { value: 'S3', label: 'Biosafety level 3' }
    ];
    return (
      <Form.Group as={Row} className="mt-3">
        <Form.Label column sm={3}>Biosafety level</Form.Label>
        <Col sm={9}>
          <Select
            isDisabled={readOnly}
            options={options}
            isClearable={false}
            value={options.find(({value}) => value === item.bioSafetyLevel)}
            onChange={(e) => { cellLineDetailsStore.changeBioSafetyLevel(item.id, e.value); }}
          />
        </Col>
      </Form.Group>
    );
  }

  renderAmount(item) {
    const { cellLineDetailsStore } = this.context;
    const { readOnly } = this.props;
    const styleClassUnit = item.unit === '' ? 'invalid-input' : '';
    const options = [
      { value: 'g', label: 'g' },
      { value: 'units/cm²', label: 'units/cm²' },
    ];

    const unitComponent = readOnly ? (
      <Form.Control
        disabled
        className=""
        type="text"
        value={item.unit}
        onChange={() => {}}
      />
    ) : (
      <CreatableSelect
        className={styleClassUnit}
        onChange={(e) => { cellLineDetailsStore.changeUnit(item.id, e.value); }}
        onInputChange={(e, action) => {
          if (action.action === 'input-change') { cellLineDetailsStore.changeUnit(item.id, e); }
        }}
        options={options}
        placeholder="choose/enter unit"
        defaultInputValue={item.unit}
      />
    );

    return (
      <Form.Group as={Row} className="align-items-baseline">
        <Form.Label column sm={3}>Amount *</Form.Label>
        <Col sm={6}>
          <Amount
            cellLineId={item.id}
            initialValue={item.amount}
            readOnly={readOnly}
          />
        </Col>
        <Col sm={3} className="amount-unit">
          {unitComponent}
        </Col>
      </Form.Group>
    );
  }

  render() {
    const { item, readOnly } = this.props;
    const { cellLineDetailsStore } = this.context;
    const cellLineItem = cellLineDetailsStore.cellLines(item.id);
    const cellLineId = item.id;

    return (
      <Accordion
        className="cell-line-properties"
        id={`cellLinePropertyPanelGroupOf:${cellLineItem.id}`}
        defaultActiveKey="common-properties"
      >
        <Accordion.Item eventKey="common-properties">
          <Accordion.Header>
            <InvalidPropertyWarning item={item} propsToCheck={['cellLineName', 'source']} />
            Common Properties
          </Accordion.Header>
          <Accordion.Body>
            <CellLineName
              id={cellLineId}
              name={cellLineItem.cellLineName}
              readOnly={readOnly}
            />
            {this.renderAttribute('Source *', cellLineItem.source, (e) => {
              cellLineDetailsStore.changeSource(cellLineId, e.target.value);
            })}

            {this.renderOptionalAttribute('Disease', cellLineItem.disease, (e) => {
              cellLineDetailsStore.changeDisease(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Organism', cellLineItem.organism, (e) => {
              cellLineDetailsStore.changeOrganism(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Tissue', cellLineItem.tissue, (e) => {
              cellLineDetailsStore.changeTissue(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Growth medium', cellLineItem.growthMedium, (e) => {
              cellLineDetailsStore.changeGrowthMedium(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Mutation', cellLineItem.mutation, (e) => {
              cellLineDetailsStore.changeMutation(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Variant', cellLineItem.variant, (e) => {
              cellLineDetailsStore.changeVariant(cellLineId, e.target.value);
            })}
            {this.renderBiosafetyLevel(cellLineItem)}
            {this.renderOptionalAttribute(
              'Cryopreservation medium',
              cellLineItem.cryopreservationMedium,
              (e) => { cellLineDetailsStore.changeCryoMedium(cellLineId, e.target.value); }
            )}
            {this.renderOptionalAttribute('Opt. growth temperature', cellLineItem.optimalGrowthTemperature, (e) => {
              cellLineDetailsStore.changeOptimalGrowthTemp(cellLineId, Number(e.target.value));
            })}
            {this.renderOptionalAttribute('Gender', cellLineItem.gender, (e) => {
              cellLineDetailsStore.changeGender(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Cell type', cellLineItem.cellType, (e) => {
              cellLineDetailsStore.changeCellType(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Description', cellLineItem.materialDescription, (e) => {
              cellLineDetailsStore.changeMaterialDescription(cellLineId, e.target.value);
            })}
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="specific-properties">
          <Accordion.Header>
            <InvalidPropertyWarning item={item} propsToCheck={['passage', 'amount', 'unit']} />
            Item specific properties
          </Accordion.Header>
          <Accordion.Body>
            {this.renderAmount(cellLineItem)}
            {this.renderAttribute('Passage *', cellLineItem.passage, (e) => {
              cellLineDetailsStore.changePassage(cellLineId, Number(e.target.value));
            }, false, true)}
            {this.renderOptionalAttribute('Contamination', cellLineItem.contamination, (e) => {
              cellLineDetailsStore.changeContamination(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Name of specific probe', cellLineItem.itemName, (e) => {
              cellLineDetailsStore.changeItemName(cellLineId, e.target.value);
            })}
            {this.renderOptionalAttribute('Description', cellLineItem.itemDescription, (e) => {
              cellLineDetailsStore.changeItemDescription(cellLineId, e.target.value);
            })}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  }
}

export default observer(GeneralProperties);

GeneralProperties.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    id: PropTypes.string.isRequired
  }).isRequired
};
