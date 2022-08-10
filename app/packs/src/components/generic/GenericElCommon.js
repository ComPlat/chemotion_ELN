/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Col, PanelGroup, Row } from 'react-bootstrap';
import { sortBy, findIndex } from 'lodash';
import uuid from 'uuid';
import { genUnits, unitConversion } from 'src/apps/admin/generic/Utils';
import Attachment from 'src/models/Attachment';
import {
  GenPropertiesText, GenPropertiesCheckbox, GenPropertiesSelect, GenPropertiesCalculate,
  GenPropertiesNumber, GenPropertiesSystemDefined, GenPropertiesInputGroup, GenPropertiesDrop,
  GenPropertiesTextArea, GenPropertiesUpload, GenDummy, GenTextFormula, GenPropertiesTable
} from 'src/components/generic/GenericPropertiesFields';

const UploadInputChange = (properties, event, field, layer) => {
  const files = [];
  const fieldObj = properties.layers[`${layer}`].fields.find(e => e.field === field) || {};
  const value = fieldObj.value || {};
  switch (event.action) {
    case 'l': {
      const valIdx = findIndex((value.files || []), o => o.uid === event.uid);
      const label = event && event.val && event.val.target && event.val.target.value;
      if (value.files[valIdx] && label) value.files[valIdx].label = label;
      break;
    }
    case 'f': {
      (event.val || []).forEach((file) => {
        const uid = uuid.v4();
        if (typeof value.files === 'undefined' || value.files === null) value.files = [];
        value.files.push({ uid, filename: file.name });
        files.push({ uid, filename: file.name, file: Attachment.fromFile(file) });
      });
      break;
    }
    case 'd': {
      const valIdx = findIndex((value.files || []), o => o.uid === event.uid);
      if (valIdx >= 0 && value.files && value.files.length > 0) value.files.splice(valIdx, 1);
      return [value, files, event.uid];
    }
    default:
      console.log(event);
  }
  return [value, files];
};


const ShowProperties = (fObj, layers) => {
  let showField = true;
  if (fObj && fObj.cond_fields && fObj.cond_fields.length > 0) {
    showField = false;
    for (let i = 0; i < fObj.cond_fields.length; i += 1) {
      const cond = fObj.cond_fields[i] || {};
      const { layer, field, value } = cond;
      if (field && field !== '') {
        const fd = ((layers[layer] || {}).fields || []).find(f => f.field === field) || {};
        if (fd.type === 'checkbox' && ((['false', 'no', 'f', '0'].includes((value || '').trim().toLowerCase()) && (typeof (fd && fd.value) === 'undefined' || fd.value === false)) ||
          (['true', 'yes', 't', '1'].includes((value || '').trim().toLowerCase()) && (typeof (fd && fd.value) !== 'undefined' && fd.value === true)))) {
          showField = true;
          break;
        } else if (['text', 'select'].includes(fd && fd.type) && (typeof (fd && fd.value) !== 'undefined' && ((fd && fd.value) || '').trim() == (value || '').trim())) {
          showField = true;
          break;
        }
      }
    }
  }
  return showField;
};

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
    case 'upload':
      return GenPropertiesUpload(fieldProps);
    case 'dummy':
      return GenDummy();
    case 'table':
      return GenPropertiesTable(fieldProps);
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

  handleChange(e, f, k, t) {
    this.props.onChange(e, f, k, t);
  }

  handleSubChange(e, id, f, valueOnly = false) {
    const sub = f.sub_fields.find(m => m.id === id);
    if (!valueOnly) {
      if (e.type === 'system-defined') {
        const units = genUnits(e.option_layers);
        let uIdx = units.findIndex(u => u.key === e.value_system);
        if (uIdx < units.length - 1) uIdx += 1; else uIdx = 0;
        sub.value_system = units.length > 0 ? units[uIdx].key : '';
        sub.value = unitConversion(e.option_layers, sub.value_system, e.value);
      } else {
        sub.value = e.target.value;
      }
    }
    const { layer } = this.props;
    const obj = { f, sub };
    this.props.onSubChange(layer.key, obj, valueOnly);
  }

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
    let newRow = 0;
    let rowId = 1;
    (fields || []).forEach((f, i) => {
      if (ShowProperties(f, layers)) {
        const unit = genUnits(f.option_layers)[0] || {};
        const tabCol = (f.cols || 1) * 1;
        const rCol = (f.type === 'table') ? (12 / (tabCol || 1)) : col;
        newRow = (f.type === 'table') ? newRow += (perRow / (tabCol || 1)) : newRow += 1;

        if (newRow > perRow) {
          vs.push(<Row key={rowId}>{op}</Row>);
          rowId += 1;
          op = [];
          newRow = (f.type === 'table') ? newRow = (perRow / (tabCol || 1)) : newRow = 1;
        }
        const eachCol = (
          <Col key={`prop_${key}_${f.priority}_${f.field}`} md={rCol} lg={rCol} className={f.type === 'table' ? '' : klaz}>
            <GenProperties
              key={`${id}_${layer}_${f.field}_GenPropertiesLayer`}
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
              options={(selectOptions && selectOptions[f.option_layers] && selectOptions[f.option_layers].options) || []}
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
        if (newRow % perRow === 0) newRow = 0;
        if ((newRow === 0) || (fields.length === (i + 1))) {
          vs.push(<Row key={rowId}>{op}</Row>);
          rowId += 1;
          op = [];
        }
      } else if (fields.length === (i + 1)) {
        vs.push(<Row key={rowId}>{op}</Row>);
        rowId += 1;
        op = [];
      }
    });
    return vs;
  }

  render() {
    let bs = this.props.layer.color ? this.props.layer.color : 'default';
    const noneKlass = bs === 'none' ? 'generic_panel_none' : '';
    if (bs === 'none') bs = 'default';
    const cl = this.props.layer.style ? this.props.layer.style : 'panel_generic_heading';
    const panelHeader = this.props.layer.label === '' ? (<span />) : (
      <Panel.Heading className={cl} >
        <Panel.Title toggle>{this.props.layer.label}</Panel.Title>
      </Panel.Heading>
    );
    return (
      <PanelGroup accordion id="accordion_generic_layer" defaultActiveKey="1" style={{ marginBottom: '0px' }}>
        <Panel bsStyle={bs} className={`panel_generic_properties ${noneKlass}`} eventKey="1">
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
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  layer: PropTypes.object,
  selectOptions: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSubChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  layers: PropTypes.object.isRequired
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
    if (e.type === 'system-defined') {
      const units = genUnits(e.option_layers);
      let uIdx = units.findIndex(u => u.key === e.value_system);
      if (uIdx < units.length - 1) uIdx += 1; else uIdx = 0;
      sub.value_system = units.length > 0 ? units[uIdx].key : '';
      sub.value = unitConversion(e.option_layers, sub.value_system, e.value);
    } else {
      sub.value = e.target.value;
    }
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
    (fields || []).forEach((f, i) => {
      const unit = genUnits(f.option_layers)[0] || {};
      const eCol = (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col} lg={col} className={klaz}>
          <GenPropertiesSearch
            f_obj={f}
            label={f.label}
            value={f.value || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            options={(selectOptions && selectOptions[f.option_layers] && selectOptions[f.option_layers].options) || []}
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
    if (typeof layer.cond_fields === 'undefined' || layer.cond_fields == null || layer.cond_fields.length === 0) {
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
    } else if (layer.cond_fields && layer.cond_fields.length > 0) {
      let showLayer = false;

      for (let i = 0; i < layer.cond_fields.length; i += 1) {
        const cond = layer.cond_fields[i] || {};
        const fd = ((layers[cond.layer] || {}).fields || []).find(f => f.field === cond.field) || {};
        if (fd.type === 'checkbox' && ((['false', 'no', 'f', '0'].includes((cond.value || '').trim().toLowerCase()) && (typeof (fd && fd.value) === 'undefined' || fd.value === false)) ||
          (['true', 'yes', 't', '1'].includes((cond.value || '').trim().toLowerCase()) && (typeof fd.value !== 'undefined' && fd.value === true)))) {
          showLayer = true;
          break;
        } else if (['text', 'select'].includes(fd.type) && (typeof (fd && fd.value) !== 'undefined' && (fd.value || '').trim() == (cond.value || '').trim())) {
          showLayer = true;
          break;
        }
      }

      if (showLayer === true) {
        const igs = (
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
        layout.push(igs);
      }
    }
  });

  return layout;
};

export {
  LayersLayout,
  GenProperties,
  UploadInputChange,
  GenPropertiesLayer,
  GenPropertiesLayerSearchCriteria,
};
