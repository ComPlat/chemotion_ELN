/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Col, ControlLabel, FormGroup, FormControl, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import uuid from 'uuid';
import Select from 'react-select';
import GenericElDropTarget from './GenericElDropTarget';

const canEdit = (fs, currentIdx) => {
  if (currentIdx === 0) { return true; }
  const findIdx = fs.findIndex(f => !f.value || (f.value && f.value === ''));
  if (findIdx >= 0 && findIdx < currentIdx) {
    return false;
  }
  return true;
};

const GenPropertiesText = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  return (
    <FormGroup className="text_generic_properties">
      <ControlLabel>{opt.label}</ControlLabel>
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

const GenPropertiesSelect = (opt) => {
  const options = opt.options.map(op => ({ value: op.key, name: op.key, label: op.label }));
  let className = opt.isEditable ? 'select_generic_properties_editable' : 'select_generic_properties_readonly';
  className = opt.isRequired && opt.isEditable ? 'select_generic_properties_required' : className;
  return (
    <FormGroup>
      <ControlLabel>{opt.label}</ControlLabel>
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

const GenPropertiesDrop = (opt) => {
  const className = opt.isRequired ? 'drop_generic_properties field_required' : 'drop_generic_properties';
  return (
    <FormGroup>
      <ControlLabel>{opt.label}</ControlLabel>
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
    case 'select':
      return GenPropertiesSelect(fieldProps);
    case 'drag':
      fieldProps.dndItems = [...fieldProps.dndItems, type[1]];
      return GenPropertiesDrop(fieldProps);
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

  views() {
    const { layer, selectOptions } = this.props;
    const { cols, fields, key } = layer;
    const col = Math.floor(12 / (cols || 1));
    const vs = fields.map((f, i) => {
      return (
        <Col key={`prop_${key}_${f.priority}_${f.field}`} md={col} lg={col}>
          <GenProperties
            label={f.label}
            value={f.value || ''}
            type={f.type || 'text'}
            field={f.field || 'field'}
            options={(selectOptions && selectOptions[f.option_layers]) || []}
            onChange={event => this.handleChange(event, f.field, key, f.type)}
            isEditable
            readOnly={false}
            isRequired={f.required || false}
            placeholder={f.placeholder || ''}
          />
        </Col>
      );
    });
    return vs;
  }

  render() {
    return (
      <Panel className="panel_generic_properties" defaultExpanded>
        <Panel.Heading>
          <Panel.Title toggle>
            {this.props.layer.label}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {this.views()}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

GenPropertiesLayer.propTypes = {
  layer: PropTypes.object,
  selectOptions: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

GenPropertiesLayer.defaultProps = {
  selectOptions: {}
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
        <Panel.Heading>
          <Panel.Title toggle>
            {this.props.layer.label}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {this.views()}
          </Panel.Body>
        </Panel.Collapse>
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

export {
  GenProperties,
  GenPropertiesLayer,
  GenPropertiesLayerSearchCriteria,
};
