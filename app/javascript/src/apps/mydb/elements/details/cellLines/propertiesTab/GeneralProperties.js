import React from 'react';
import {
  Accordion, Col, Row, Form
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Select } from 'src/components/common/Select';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import CellLineName from 'src/apps/mydb/elements/details/cellLines/propertiesTab/CellLineName';
import Amount from 'src/apps/mydb/elements/details/cellLines/propertiesTab/Amount';
import InvalidPropertyWarning from 'src/apps/mydb/elements/details/cellLines/propertiesTab/InvalidPropertyWarning';
import UserStore from 'src/stores/alt/stores/UserStore';

class GeneralProperties extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  checkPermission(attributeName) {
    const readonlyAttributes = [
      'Disease', 'Organism', 'Tissue', 'Growth medium', 'Mutation', 'Variant', 'Biosafety level',
      'Cryopreservation medium', 'Opt. growth temperature', 'Gender', 'Cell type', 'Material Description'
    ];
    const { item } = this.props;
    const { currentUser } = UserStore.getState();
    if (item.created_by == null) {
      const { cellLineDetailsStore } = this.context;
      const cellLine = cellLineDetailsStore.cellLines(item.id);
      return readonlyAttributes.includes(attributeName)
        && cellLine.created_by !== '' && cellLine.created_by !== currentUser.id.toString();
    }
    return readonlyAttributes.includes(attributeName) && item.created_by !== currentUser.id;
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
      <Form.Group>
        <Form.Label>{attributeName}</Form.Label>
        <Form.Control
          disabled={readOnly || this.checkPermission(attributeName)}
          className={styleClass}
          type="text"
          value={defaultValue}
          onChange={onChangeCallBack}
        />
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
      <Form.Group>
        <Form.Label>Biosafety level</Form.Label>
        <Select
          isDisabled={readOnly || this.checkPermission('Biosafety level')}
          options={options}
          isClearable={false}
          value={options.find(({ value }) => value === item.bioSafetyLevel)}
          onChange={(e) => { cellLineDetailsStore.changeBioSafetyLevel(item.id, e.value); }}
        />
      </Form.Group>
    );
  }

  renderAmount(item) {
    const { cellLineDetailsStore } = this.context;
    const { readOnly } = this.props;
    let unitClass = 'flex-grow-1 w-50';
    unitClass = item.unit === '' ? `invalid-input ${unitClass}` : unitClass;
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
      <Select
        name="unit"
        className={unitClass}
        value={options.find(({ value }) => value === item.unit)}
        onChange={(e) => { cellLineDetailsStore.changeUnit(item.id, e.value); }}
        options={options}
        placeholder="unit"
      />
    );

    return (
      <Form.Group className="align-items-baseline">
        <Form.Label>Amount *</Form.Label>
        <div className="d-flex gap-2 w-100">
          <Amount
            cellLineId={item.id}
            initialValue={item.amount}
            readOnly={readOnly || this.checkPermission('Amount')}
          />
          {unitComponent}
        </div>
      </Form.Group>
    );
  }

  render() {
    const { item, readOnly } = this.props;
    const { cellLineDetailsStore } = this.context;
    const cellLineItem = cellLineDetailsStore.cellLines(item.id);
    const cellLineId = item.id;

    return (
      <Form>
        <Accordion
          className="mb-3"
          id={`cellLinePropertyPanelGroupOf:${cellLineItem.id}`}
          defaultActiveKey="common-properties"
        >
          <Accordion.Item eventKey="common-properties">
            <Accordion.Header>
              <InvalidPropertyWarning item={item} propsToCheck={['cellLineName', 'source']} />
              Common Properties
            </Accordion.Header>
            <Accordion.Body>
              <Row className="mb-4">
                <Col>
                  <CellLineName
                    id={cellLineId}
                    name={cellLineItem.cellLineName}
                    readOnly={readOnly}
                  />
                </Col>
                <Col>
                  {this.renderAttribute('Source *', cellLineItem.source, (e) => {
                    cellLineDetailsStore.changeSource(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <hr />
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Disease', cellLineItem.disease, (e) => {
                    cellLineDetailsStore.changeDisease(cellLineId, e.target.value);
                  })}
                </Col>
                <Col>
                  {this.renderOptionalAttribute('Organism', cellLineItem.organism, (e) => {
                    cellLineDetailsStore.changeOrganism(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Mutation', cellLineItem.mutation, (e) => {
                    cellLineDetailsStore.changeMutation(cellLineId, e.target.value);
                  })}
                </Col>
                <Col>
                  {this.renderOptionalAttribute('Variant', cellLineItem.variant, (e) => {
                    cellLineDetailsStore.changeVariant(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Tissue', cellLineItem.tissue, (e) => {
                    cellLineDetailsStore.changeTissue(cellLineId, e.target.value);
                  })}
                </Col>
                <Col>
                  {this.renderOptionalAttribute('Growth medium', cellLineItem.growthMedium, (e) => {
                    cellLineDetailsStore.changeGrowthMedium(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderBiosafetyLevel(cellLineItem)}
                </Col>
                <Col>
                  {this.renderOptionalAttribute(
                    'Cryopreservation medium',
                    cellLineItem.cryopreservationMedium,
                    (e) => { cellLineDetailsStore.changeCryoMedium(cellLineId, e.target.value); }
                  )}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col sm={6}>
                  {this.renderOptionalAttribute('Opt. growth temperature', cellLineItem.optimalGrowthTemperature, (e) => {
                    cellLineDetailsStore.changeOptimalGrowthTemp(cellLineId, Number(e.target.value));
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Gender', cellLineItem.gender, (e) => {
                    cellLineDetailsStore.changeGender(cellLineId, e.target.value);
                  })}
                </Col>
                <Col>
                  {this.renderOptionalAttribute('Cell type', cellLineItem.cellType, (e) => {
                    cellLineDetailsStore.changeCellType(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row>
                <Col>
                  {this.renderOptionalAttribute('Material Description', cellLineItem.materialDescription, (e) => {
                    cellLineDetailsStore.changeMaterialDescription(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        <Accordion>
          <Accordion.Item eventKey="specific-properties">
            <Accordion.Header>
              <InvalidPropertyWarning item={item} propsToCheck={['passage', 'amount', 'unit']} />
              Sample specific properties
            </Accordion.Header>
            <Accordion.Body>
              <Row className="mb-4">
                <Col>
                  {this.renderAmount(cellLineItem)}
                </Col>
                <Col>
                  {this.renderAttribute('Passage *', cellLineItem.passage, (e) => {
                    cellLineDetailsStore.changePassage(cellLineId, Number(e.target.value));
                  }, false, true)}
                </Col>
                <Col>
                  {this.renderOptionalAttribute('Name of specific sample', cellLineItem.itemName, (e) => {
                    cellLineDetailsStore.changeItemName(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Contamination', cellLineItem.contamination, (e) => {
                    cellLineDetailsStore.changeContamination(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
              <Row className="mb-4">
                <Col>
                  {this.renderOptionalAttribute('Sample Description', cellLineItem.itemDescription, (e) => {
                    cellLineDetailsStore.changeItemDescription(cellLineId, e.target.value);
                  })}
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Form>
    );
  }
}

export default observer(GeneralProperties);

GeneralProperties.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    can_update: PropTypes.bool,
    created_by: PropTypes.number
  }).isRequired
};
