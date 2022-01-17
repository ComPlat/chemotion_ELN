/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Col, Checkbox, Panel, Form, ButtonGroup, OverlayTrigger, FormGroup, FormControl, ControlLabel, InputGroup } from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import { ButtonTooltip, genUnitSup } from '../../admin/generic/Utils';
import GroupFields from './GroupFields';
import TextFormula from '../generic/TextFormula';
import TableDef from '../generic/TableDef';

const BaseFieldTypes = [
  { value: 'integer', name: 'integer', label: 'Integer' },
  { value: 'text', name: 'text', label: 'Text' },
  { value: 'textarea', name: 'textarea', label: 'Text area' },
  { value: 'select', name: 'select', label: 'Select' },
  { value: 'checkbox', name: 'checkbox', label: 'Checkbox' },
  { value: 'system-defined', name: 'system-defined', label: 'System-Defined' },
  { value: 'formula-field', name: 'formula-field', label: 'Formula-Field' },
];

const ElementFieldTypes = [
  { value: 'drag_molecule', name: 'drag_molecule', label: 'Drag Molecule' },
  { value: 'drag_sample', name: 'drag_sample', label: 'Drag Sample' },
  { value: 'input-group', name: 'input-group', label: 'Input Group' },
  { value: 'text-formula', name: 'text-formula', label: 'Text-Formula' },
  { value: 'table', name: 'table', label: 'Table' },
  { value: 'upload', name: 'upload', label: 'Upload' },
];

const SegmentFieldTypes = [
  { value: 'input-group', name: 'input-group', label: 'Input Group' },
  { value: 'text-formula', name: 'text-formula', label: 'Text-Formula' },
  { value: 'drag_molecule', name: 'drag_molecule', label: 'Drag Molecule' },
  { value: 'table', name: 'table', label: 'Table' },
  { value: 'upload', name: 'upload', label: 'Upload' },
];

class ElementField extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handelDelete = this.handelDelete.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleAddDummy = this.handleAddDummy.bind(this);
    this.handleCond = this.handleCond.bind(this);
    this.updSubField = this.updSubField.bind(this);
  }

  updSubField(layerKey, field, cb) {
    this.props.onFieldSubFieldChange(layerKey, field, cb);
  }

  handleChange(e, orig, fe, lk, fc, tp) {
    if ((tp === 'select' || tp === 'system-defined') && e === null) { return; }
    this.props.onChange(e, orig, fe, lk, fc, tp);
  }

  handleMove(element) {
    const { l, f, isUp } = element;
    this.props.onMove(l, f, isUp);
  }

  handleAddDummy(element) {
    this.props.onDummyAdd(element);
  }

  handleCond(field, lk) {
    this.props.onShowFieldCond(field, lk);
    //this.setState({ showFieldRestriction: true, element: element });
  }

  handelDelete(delStr, delKey, delRoot) {
    this.props.onDelete(delStr, delKey, delRoot);
  }

  handleDrop(e) {
    this.props.onDrop(e);
  }

  availableUnits(val) {
    const { unitsSystem } = this.props;
    const us = (unitsSystem.fields || []).find(e => e.field === val);
    if (us === undefined) return null;
    const tbl = us.units.map(e => (<div key={uuid.v4()}>{genUnitSup(e.label)}<br /></div>));
    const popover = (
      <Popover id="popover-positioned-scrolling-left"><b><u>available units</u></b><br />{tbl}</Popover>
    );
    return (
      <OverlayTrigger animation placement="top" root trigger={['hover', 'focus', 'click']} overlay={popover}>
        <Button bsSize="xs"><i className="fa fa-table" aria-hidden="true" /></Button>
      </OverlayTrigger>
    );
  }

  renderDeleteButton(delStr, delKey, delRoot) {
    const msg = `remove this field: [${delKey}] from layer [${delRoot}] `;
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handelDelete(delStr, delKey, delRoot)}>
            Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.handleClick} >
            No
          </Button>
        </div>
      </Popover>
    );

    return (
      <OverlayTrigger animation placement="top" root trigger="focus" overlay={popover}>
        <Button bsSize="xs" ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
      </OverlayTrigger>
    );
  }

  renderDummyFieldGroup(f) {
    return (
      <FormGroup controlId={`frmCtrlFid_${this.props.layerKey}_${f.field}`}>
        <Col componentClass={ControlLabel} sm={3}>{`(${f.type})`}</Col>
        <Col sm={9}><FormControl type="text" name={`f_${f.field}`} defaultValue={`${f.type},  an invisible entry (${f.field})`} disabled /></Col>
      </FormGroup>
    );
  }

  renderTextFieldGroup(f, label, field) {
    return (
      <FormGroup controlId={`frmCtrlFid_${this.props.layerKey}_${f.field}_${field}`}>
        <Col componentClass={ControlLabel} sm={3}>{label}</Col>
        <Col sm={9}>
          <FormControl
            type="text"
            name={`f_${field}`}
            defaultValue={f[field]}
            disabled={field === 'field'}
            onChange={event => this.handleChange(event, f[field], f.field, this.props.layerKey, field, 'text')}
          />
        </Col>
      </FormGroup>
    );
  }

  renderComponent() {
    const { unitsSystem, layerKey, genericType, allLayers } = this.props;
    const unitConfig = (unitsSystem.fields || []).map(_c =>
      ({ value: _c.field, name: _c.label, label: _c.label }));
    let typeOpts = BaseFieldTypes;
    switch (genericType) {
      case 'Element':
        typeOpts = BaseFieldTypes.concat(ElementFieldTypes);
        break;
      case 'Segment':
        typeOpts = BaseFieldTypes.concat(SegmentFieldTypes);
        break;
      default:
        typeOpts = BaseFieldTypes;
    }
    typeOpts.sort((a, b) => a.value.localeCompare(b.value));
    const f = this.props.field;
    const hasCond = (f && f.cond_fields && f.cond_fields.length > 0) || false;
    const btnCond = hasCond ?
      (<ButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(f, layerKey)} bs="warning" element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />) :
      (<ButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(f, layerKey)} element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />)
    const formulaField = (f.type === 'formula-field') ? (
      <FormGroup controlId="formControlFieldType">
        <Col componentClass={ControlLabel} sm={3}>Formula</Col>
        <Col sm={9}>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '100%' }}>
              <FormControl
                type="text"
                name="f_label"
                defaultValue={f.formula}
                onChange={event => this.handleChange(event, f.label, f.field, this.props.layerKey, 'formula', 'text')}
              />
            </span>
          </div>
        </Col>
      </FormGroup>)
      : (<div />);
    const selectOptions = (f.type === 'select' || f.type === 'system-defined') ? (
      <FormGroup controlId="formControlFieldType">
        <Col componentClass={ControlLabel} sm={3}>{f.type === 'select' ? 'Options' : <span />}</Col>
        <Col sm={9}>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '100%' }}>
              <Select
                className="drop-up"
                name={f.field}
                multi={false}
                options={f.type === 'select' ? this.props.select_options : unitConfig}
                value={f.option_layers || ''}
                onChange={event => this.handleChange(event, f.option_layers, f.field, layerKey, 'option_layers', f.type)}
              />
            </span>
            {f.type === 'select' ? null : this.availableUnits(f.option_layers)}
          </div>
        </Col>
      </FormGroup>)
      : (<div />);
    const skipRequired = ['Segment', 'Dataset'].includes(genericType) || !['integer', 'text'].includes(f.type) ? { display: 'none' } : {};
    const groupOptions = ['input-group'].includes(f.type) ? (
      <FormGroup controlId={`frmCtrlFid_${layerKey}_${f.field}_sub_fields`}>
        <Col componentClass={ControlLabel} sm={3}>{' '}</Col>
        <Col sm={9}>
          <GroupFields layerKey={layerKey} field={f} updSub={this.updSubField} unitsFields={(unitsSystem.fields || [])} />
        </Col>
      </FormGroup>
    ) : null;
    const tableOptions = ['table'].includes(f.type) ? (
      <FormGroup controlId={`frmCtrlFid_${layerKey}_${f.field}_sub_fields`}>
        <Col componentClass={ControlLabel} sm={3}>{' '}</Col>
        <Col sm={9}>
          <TableDef genericType={genericType} layerKey={layerKey} field={f} updSub={this.updSubField} unitsFields={(unitsSystem.fields || [])} />
          <InputGroup>
            <InputGroup.Addon>Tables per row</InputGroup.Addon>
            <FormControl componentClass="select" defaultValue={f.cols || 1} onChange={event => this.handleChange(event, f.cols, f.field, layerKey, 'cols', f.cols)} >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </FormControl>
          </InputGroup>
        </Col>
      </FormGroup>
    ) : null;
    const textFormula = ['text-formula'].includes(f.type) ? (
      <FormGroup controlId={`frmCtrlFid_${layerKey}_${f.field}_text_sub_fields`}>
        <Col componentClass={ControlLabel} sm={3}>{' '}</Col>
        <Col sm={9}>
          <TextFormula layerKey={layerKey} field={f} updSub={this.updSubField} allLayers={allLayers} />
        </Col>
      </FormGroup>
    ) : null;
    return (
      <div>
        <Panel>
          <Panel.Heading className="template_panel_heading">
            <Panel.Title toggle>
              {this.props.position}&nbsp;
              {['dummy'].includes(f.type) ? '(dummy field)' : f.field}
            </Panel.Title>
            <ButtonGroup bsSize="xsmall">
              {btnCond}
              <ButtonTooltip tip="Move Up" fnClick={this.handleMove} element={{ l: layerKey, f: f.field, isUp: true }} fa="fa-arrow-up" place="top" disabled={this.props.position === 1} />
              <ButtonTooltip tip="Move Down" fnClick={this.handleMove} element={{ l: layerKey, f: f.field, isUp: false }} fa="fa-arrow-down" place="top" />
              {this.renderDeleteButton('Field', f.field, layerKey)}
              <ButtonTooltip tip="Add Dummy field" fnClick={this.handleAddDummy} element={{ l: layerKey, f: f.field }} fa="fa fa-plus-circle" place="top" />
            </ButtonGroup>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <Form horizontal className="default_style">
                {['dummy'].includes(f.type) ? this.renderDummyFieldGroup(f) : null}
                {!['dummy'].includes(f.type) ? this.renderTextFieldGroup(f, 'Field Name', 'field') : null}
                {!['dummy'].includes(f.type) ? this.renderTextFieldGroup(f, 'Display Name', 'label') : null}
                {!['dummy'].includes(f.type) ? this.renderTextFieldGroup(f, 'Hover Info', 'description') : null}
                {
                  ['dummy'].includes(f.type) ? null : (
                    <FormGroup controlId={`frmCtrlFid_${layerKey}_${f.field}_type`}>
                      <Col componentClass={ControlLabel} sm={3}>Type</Col>
                      <Col sm={9}>
                        <div style={{ display: 'flex' }}>
                          <span style={{ width: '100%' }}>
                            <Select
                              className="drop-up"
                              name={f.field}
                              multi={false}
                              options={typeOpts}
                              value={f.type}
                              onChange={event => this.handleChange(event, f.type, f.field, layerKey, 'type', 'select')}
                            />
                          </span>
                        </div>
                      </Col>
                    </FormGroup>)
                  }
                { groupOptions }
                { tableOptions }
                { selectOptions }
                { formulaField }
                { textFormula }
                {
                  ['dummy'].includes(f.type) ? null : (
                    <FormGroup controlId={`frmCtrlFid_${layerKey}_${f.field}_required`} style={skipRequired}>
                      <Col componentClass={ControlLabel} sm={3}>
                        Required
                      </Col>
                      <Col sm={9}>
                        <Checkbox
                          checked={f.required}
                          onChange={event => this.handleChange(event, f.required, f.field, layerKey, 'required', 'checkbox')}
                        />
                      </Col>
                    </FormGroup>)
                }
                {['integer', 'text'].includes(f.type) ? this.renderTextFieldGroup(f, 'Placeholder', 'placeholder') : null}
              </Form>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }

  render() { return <Col md={12}>{this.renderComponent()}</Col>; }
}

ElementField.propTypes = {
  genericType: PropTypes.string, // PropTypes.arrayOf(PropTypes.object),
  layerKey: PropTypes.string.isRequired,
  select_options: PropTypes.array.isRequired,
  position: PropTypes.number.isRequired,
  field: PropTypes.shape({
    field: PropTypes.string,
    type: PropTypes.string,
    label: PropTypes.string,
  }).isRequired,
  onDrop: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  unitsSystem: PropTypes.object,
  onFieldSubFieldChange: PropTypes.func.isRequired,
  onDummyAdd: PropTypes.func.isRequired,
  onShowFieldCond: PropTypes.func.isRequired,
};

ElementField.defaultProps = { genericType: 'Element', unitsSystem: [] };

export { ElementField, ElementFieldTypes };
