/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Checkbox, Col, ControlLabel, FormGroup, FormControl, Button, Tooltip, OverlayTrigger, Row, InputGroup } from 'react-bootstrap';
import uuid from 'uuid';
import { sortBy } from 'lodash';
import Select from 'react-select';
import GenericElDropTarget from './GenericElDropTarget';
import { genUnit, genUnits } from '../../admin/generic/Utils';

const GenPropertiesText = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const disKlaz = (typeof opt.description == 'undefined' || opt.description == null || opt.description.trim().length == 0) ? 'manual' : ['hover', 'focus'];

  return (
    <FormGroup className="text_generic_properties">
      <OverlayTrigger placement="top" trigger={disKlaz} delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{opt.description }</Tooltip>}>
        <ControlLabel>{opt.label}</ControlLabel>
      </OverlayTrigger>
      <FormControl
        type="text"
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        readOnly={opt.readOnly}
        required={opt.isRequired}
        placeholder={opt.placeholder}
      />
    </FormGroup>
  );
};

const GenPropertiesCheckbox = (opt) => {
  let className = opt.isEditable ? 'select_generic_properties_editable' : 'select_generic_properties_readonly';
  className = opt.isRequired && opt.isEditable ? 'select_generic_properties_required' : className;
  return (
    <FormGroup>
      <Checkbox
        inline
        name={opt.field}
        checked={opt.value}
        onChange={opt.onChange}
        className={className}
        disabled={opt.readOnly}
      >
        <FormControl.Static>{opt.label}</FormControl.Static>
      </Checkbox>
    </FormGroup>
  );
};

const GenPropertiesSelect = (opt) => {
  const options = opt.options.map(op => ({ value: op.key, name: op.key, label: op.label }));
  let className = opt.isEditable ? 'select_generic_properties_editable' : 'select_generic_properties_readonly';
  className = opt.isRequired && opt.isEditable ? 'select_generic_properties_required' : className;
  const disKlaz = (typeof opt.description == 'undefined' || opt.description == null || opt.description.trim().length == 0) ? 'manual' : ['hover', 'focus'];

  return (
    <FormGroup>
      <OverlayTrigger placement="top" trigger={disKlaz} delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{opt.description }</Tooltip>}>
        <ControlLabel>{opt.label}</ControlLabel>
      </OverlayTrigger>
      <Select
        name={opt.field}
        multi={false}
        options={options}
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        disabled={opt.readOnly}
      />
    </FormGroup>
  );
};

const GenPropertiesNumber = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const disKlaz = (typeof opt.description == 'undefined' || opt.description == null || opt.description.trim().length == 0) ? 'manual' : ['hover', 'focus'];

  return (
    <FormGroup>
      <OverlayTrigger placement="top" trigger={disKlaz} delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{opt.description }</Tooltip>}>
        <ControlLabel>{opt.label}</ControlLabel>
      </OverlayTrigger>
      <FormControl
        type="number"
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        readOnly={opt.readOnly}
        required={opt.isRequired}
        placeholder={opt.placeholder}
        min={1}
      />
    </FormGroup>
  );
};

const GenPropertiesSystemDefined = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const disKlaz = (typeof opt.description == 'undefined' || opt.description == null || opt.description.trim().length == 0) ? 'manual' : ['hover', 'focus'];

  return (
    <FormGroup>
      <OverlayTrigger placement="top" trigger={disKlaz} delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{opt.description }</Tooltip>}>
        <ControlLabel>{opt.label}</ControlLabel>
      </OverlayTrigger>
      <InputGroup>
        <FormControl
          type="number"
          value={opt.value}
          onChange={opt.onChange}
          className={className}
          readOnly={opt.readOnly}
          required={opt.isRequired}
          placeholder={opt.placeholder}
          min={1}
        />
        <InputGroup.Button>
          <Button disabled={opt.readOnly} active onClick={opt.onClick} bsStyle="success">
            {genUnit(opt.option_layers, opt.value_system).label || ''}
          </Button>
        </InputGroup.Button>
      </InputGroup>
    </FormGroup>
  );
};

const GenPropertiesDrop = (opt) => {
  const className = opt.isRequired ? 'drop_generic_properties field_required' : 'drop_generic_properties';
  const disKlaz = (typeof opt.description == 'undefined' || opt.description == null || opt.description.trim().length == 0) ? 'manual' : ['hover', 'focus'];

  return (
    <FormGroup>
      <OverlayTrigger placement="top" trigger={disKlaz} delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{opt.description }</Tooltip>}>
        <ControlLabel>{opt.label}</ControlLabel>
      </OverlayTrigger>
      <FormControl.Static style={{ paddingBottom: '0px' }}>
        <div className={className}>
          <GenericElDropTarget
            opt={opt}
            onDrop={opt.onChange}
          />
          <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>remove</Tooltip>}>
            <Button className="btn_del" bsStyle="danger" bsSize="xsmall" onClick={() => opt.onChange({})} ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
          </OverlayTrigger>
        </div>
      </FormControl.Static>
    </FormGroup>
  );
};

const GenProperties = (opt) => {
  const fieldProps = { ...opt, dndItems: [] };
  const type = fieldProps.type.split('_');
  if (opt.isSearchCriteria && type[0] === 'drag') type[0] = 'text';
  switch (type[0]) {
    case 'checkbox':
      return GenPropertiesCheckbox(fieldProps);
    case 'select':
      return GenPropertiesSelect(fieldProps);
    case 'drag':
      fieldProps.dndItems = [...fieldProps.dndItems, type[1]];
      return GenPropertiesDrop(fieldProps);
    case 'integer':
      return GenPropertiesNumber(fieldProps);
    case 'system-defined':
      return GenPropertiesSystemDefined(fieldProps);
    default:
      return GenPropertiesText(fieldProps);
  }
};

const GenPropertiesSearch = opt => GenProperties({ ...opt, isSearchCriteria: true });

class GenPropertiesLayer extends Component {
  // event, field, layer, type
  handleChange(e, f, k, t) {
    this.props.onChange(e, f, k, t);
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
    const { layer, selectOptions } = this.props;
    const { cols, fields, key } = layer;
    const col = Math.floor(12 / (cols || 1));
    const perRow = 12 / col;
    const vs = [];
    let op = [];
    fields.forEach((f, i) => {
      const unit = genUnits(f.option_layers)[0] || {};
      const eachCol = (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col} lg={col}>
          <GenProperties
            label={f.label}
            value={f.value || ''}
            description={f.description || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            options={(selectOptions && selectOptions[f.option_layers]) || []}
            onChange={event => this.handleChange(event, f.field, key, f.type)}
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
      if (((i + 1) % perRow === 0) || ((i + 1) % perRow !== 0 && fields.length === (i + 1))) {
        vs.push(<Row key={`prop_row_${key}_${f.priority}_${f.field}`}>{op}</Row>);
        op = [];
      }
    });
    return vs;
  }

  render() {
    return (
      <Panel className="panel_generic_properties" defaultExpanded>
        <Panel.Heading>
          <Panel.Title toggle>{this.props.layer.label}</Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>{this.views()}</Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

GenPropertiesLayer.propTypes = {
  layer: PropTypes.object,
  selectOptions: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func
};

GenPropertiesLayer.defaultProps = {
  selectOptions: {}, onClick: () => {}
};

class GenPropertiesLayerSearchCriteria extends Component {
  handleChange(e, f, k, t) {
    this.props.onChange(e, f, k, t);
  }

  views() {
    const { layer, selectOptions } = this.props;
    const { cols, fields, key } = layer;
    const col = 12 / (cols || 1);
    const vs = fields.map((f) => {
      return (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col}>
          <GenPropertiesSearch
            label={f.label}
            value={f.value || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            options={(selectOptions && selectOptions[f.option_layers]) || []}
            onChange={event => this.handleChange(event, f.field, key, f.type)}
            isEditable
            readOnly={false}
            isRequired={false}
          />
        </Col>
      );
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
  onChange: PropTypes.func.isRequired,
};

GenPropertiesLayerSearchCriteria.defaultProps = {
  selectOptions: {}
};

const LayersLayout = (layers, options, funcChange, funcClick = () => {}, layout = []) => {
  const sortedLayers = sortBy(layers, l => l.position) || [];
  sortedLayers.forEach((layer) => {
    if (layer.condition == null || layer.condition.trim().length === 0) {
      const ig = (
        <GenPropertiesLayer
          key={layer.key}
          layer={layer}
          onChange={funcChange}
          selectOptions={options}
          onClick={funcClick}
        />
      );
      layout.push(ig);
    } else if (layer.condition && layer.condition.trim().length > 0) {
      const arr = layer.condition.split(',');
      if (arr.length >= 3) {
        const specific = layers[`${arr[0].trim()}`] && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`) && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`).value;
        if (specific === arr[2] && arr[2].trim()) {
          const igs = (
            <GenPropertiesLayer
              layer={layer}
              onChange={funcChange}
              selectOptions={options}
              onClick={funcClick}
            />
          );
          layout.push(igs);
        }
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
