/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Col, PanelGroup, Row } from 'react-bootstrap';
import { sortBy } from 'lodash';
import { genUnits } from '../../admin/generic/Utils';
import {
  GenPropertiesText, GenPropertiesCheckbox, GenPropertiesSelect, GenPropertiesCalculate,
  GenPropertiesNumber, GenPropertiesSystemDefined, GenPropertiesInputGroup, GenPropertiesDrop,
  GenPropertiesTextArea, GenDummy, GenTextFormula
} from './GenericPropertiesFields';

const GenProperties = (opt) => {
  const fieldProps = { ...opt, dndItems: [] };
  const type = fieldProps.type.split('_');
  if (opt.isSearchCriteria && type[0] === 'drag') type[0] = 'text';
  switch (type[0]) {
    case 'checkbox':
      return GenPropertiesCheckbox(fieldProps);
    case 'formula-field':
      return GenPropertiesCalculate(fieldProps);
    case 'select':
      return GenPropertiesSelect(fieldProps);
    case 'drag':
      fieldProps.dndItems = [...fieldProps.dndItems, type[1]];
      return GenPropertiesDrop(fieldProps);
    case 'integer':
      return GenPropertiesNumber(fieldProps);
    case 'system-defined':
      return GenPropertiesSystemDefined(fieldProps);
    case 'input-group':
      return GenPropertiesInputGroup(fieldProps);
    case 'textarea':
      return GenPropertiesTextArea(fieldProps);
    case 'dummy':
      return GenDummy();
    case 'text-formula':
      return GenTextFormula(fieldProps);
    default:
      return GenPropertiesText(fieldProps);
  }
};

const GenPropertiesSearch = opt => GenProperties({ ...opt, isSearchCriteria: true });

class GenPropertiesLayer extends Component {
  constructor(props) {
    super(props);
    this.handleSubChange = this.handleSubChange.bind(this);
  }
  // event, field, layer, type
  handleChange(e, f, k, t) {
    this.props.onChange(e, f, k, t);
  }

  handleSubChange(e, id, f) {
    const sub = f.sub_fields.find(m => m.id === id);
    sub.value = e.target.value;
    const { layer } = this.props;
    const obj = { f, sub };
    this.props.onSubChange(layer.key, obj);
  }

  // event, field, key of layer, field object, value, unitsSystem
  handleClick(keyLayer, obj, val) {
    const units = genUnits(obj.option_layers);
    let uIdx = units.findIndex(e => e.key === val);
    if (uIdx < units.length - 1) uIdx += 1; else uIdx = 0;
    const update = obj;
    update.value_system = units.length > 0 ? units[uIdx].key : '';
    this.props.onClick(keyLayer, update);
  }

  views() {
    const {
      layer, selectOptions, id, layers
    } = this.props;
    const { cols, fields, key } = layer;
    const perRow = cols || 1;
    const col = Math.floor(12 / perRow);
    const klaz = (12 % perRow) > 0 ? 'g_col_w' : '';
    const vs = [];
    let op = [];
    fields.forEach((f, i) => {
      const unit = genUnits(f.option_layers)[0] || {};
      const eachCol = (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col} lg={col} className={klaz}>
          <GenProperties
            layers={layers}
            id={id}
            layer={layer}
            f_obj={f}
            label={f.label}
            value={f.value || ''}
            description={f.description || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            formula={f.formula || ''}
            options={(selectOptions && selectOptions[f.option_layers]) || []}
            onChange={event => this.handleChange(event, f.field, key, f.type)}
            onSubChange={this.handleSubChange}
            isEditable
            readOnly={false}
            isRequired={f.required || false}
            placeholder={f.placeholder || ''}
            option_layers={f.option_layers}
            value_system={f.value_system || unit.key}
            onClick={() => this.handleClick(key, f, (f.value_system || unit.key))}
          />
        </Col>
      );
      op.push(eachCol);
      if (((i + 1) % perRow === 0) || (fields.length === (i + 1))) {
        vs.push(<Row key={`prop_row_${key}_${f.priority}_${f.field}`}>{op}</Row>);
        op = [];
      }
    });
    return vs;
  }

  render() {
    const bs = this.props.layer.color ? this.props.layer.color : 'default';
    const cl = this.props.layer.style ? this.props.layer.style : 'panel_generic_heading';
    const panelHeader = this.props.layer.label === '' ? (<span />) : (
      <Panel.Heading className={cl} >
        <Panel.Title toggle>{this.props.layer.label}</Panel.Title>
      </Panel.Heading>
    );
    return (
      <PanelGroup accordion id="accordion_generic_layer" defaultActiveKey="1" style={{ marginBottom: '0px' }}>
        <Panel bsStyle={bs} className="panel_generic_properties" eventKey="1">
          {panelHeader}
          <Panel.Collapse>
            <Panel.Body className="panel_generic_properties_body">{this.views()}</Panel.Body>
          </Panel.Collapse>
        </Panel>
      </PanelGroup>
    );
  }
}

GenPropertiesLayer.propTypes = {
  id: PropTypes.number,
  // eslint-disable-next-line react/require-default-props
  layer: PropTypes.object,
  selectOptions: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSubChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  layers: PropTypes.arrayOf(PropTypes.object).isRequired
};

GenPropertiesLayer.defaultProps = {
  id: 0,
  selectOptions: {},
  onClick: () => {}
};

class GenPropertiesLayerSearchCriteria extends Component {
  constructor(props) {
    super(props);
    this.handleSubChange = this.handleSubChange.bind(this);
  }

  handleChange(e, f, k, t) {
    this.props.onChange(e, f, k, t);
  }

  handleSubChange(e, id, f) {
    const sub = f.sub_fields.find(m => m.id === id);
    sub.value = e.target.value;
    const { layer } = this.props;
    const obj = { f, sub };
    this.props.onSubChange(layer.key, obj);
  }

  views() {
    const { layer, selectOptions, layers } = this.props;
    const { cols, fields, key } = layer;
    const perRow = cols || 1;
    const col = Math.floor(12 / perRow);
    const klaz = (12 % perRow) > 0 ? 'g_col_w' : '';
    const vs = [];
    let op = [];
    fields.forEach((f, i) => {
      const unit = genUnits(f.option_layers)[0] || {};
      const eCol = (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col} lg={col} className={klaz}>
          <GenPropertiesSearch
            f_obj={f}
            label={f.label}
            value={f.value || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            options={(selectOptions && selectOptions[f.option_layers]) || []}
            onChange={event => this.handleChange(event, f.field, key, f.type)}
            onSubChange={this.handleSubChange}
            option_layers={f.option_layers}
            value_system={f.value_system || unit.key}
            isEditable
            readOnly={false}
            isRequired={false}
            layers={layers}
          />
        </Col>
      );
      op.push(eCol);
      if (((i + 1) % perRow === 0) || (fields.length === (i + 1))) {
        vs.push(<Row key={`prop_row_${key}_${f.priority}_${f.field}`}>{op}</Row>);
        op = [];
      }
    });
    return vs;
  }

  render() {
    return (
      <Panel className="panel_generic_properties" defaultExpanded>
        <Panel.Heading><Panel.Title toggle>{this.props.layer.label}</Panel.Title></Panel.Heading>
        <Panel.Collapse><Panel.Body>{this.views()}</Panel.Body></Panel.Collapse>
      </Panel>
    );
  }
}

GenPropertiesLayerSearchCriteria.propTypes = {
  // eslint-disable-next-line react/require-default-props
  layer: PropTypes.object,
  selectOptions: PropTypes.object,
  onSubChange: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  layers: PropTypes.arrayOf(PropTypes.object).isRequired,
};

GenPropertiesLayerSearchCriteria.defaultProps = {
  selectOptions: {}
};

const LayersLayout = (layers, options, funcChange, funcSubChange = () => {}, funcClick = () => {}, layout = [], id = 0) => {
  const sortedLayers = sortBy(layers, l => l.position) || [];
  sortedLayers.forEach((layer) => {
    if (layer.condition == null || layer.condition.trim().length === 0) {
      const ig = (
        <GenPropertiesLayer
          id={id}
          key={layer.key}
          layer={layer}
          onChange={funcChange}
          onSubChange={funcSubChange}
          selectOptions={options}
          onClick={funcClick}
          layers={layers}
        />
      );
      layout.push(ig);
    } else if (layer.condition && layer.condition.trim().length > 0) {
      const conditions = layer.condition.split(';');
      let showLayer = false;

      for (let i = 0; i < conditions.length; i += 1) {
        const arr = conditions[i].split(',');
        if (arr.length >= 3) {
          const specificObj = layers[`${arr[0].trim()}`] && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`) && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`);
          const specific = specificObj && specificObj.value;
          if ((specific && specific.toString()) === (arr[2] && arr[2].toString().trim())) {
            showLayer = true;
            break;
          }
        }
      }

      if (showLayer === true) {
        const igs = (
          <GenPropertiesLayer
            key={layer.key}
            layer={layer}
            onChange={funcChange}
            onSubChange={funcSubChange}
            selectOptions={options}
            onClick={funcClick}
            layers={layers}
          />
        );
        layout.push(igs);
      }
    }
  });

  return layout;
};

export {
  LayersLayout,
  GenProperties,
  GenPropertiesLayer,
  GenPropertiesLayerSearchCriteria,
};
