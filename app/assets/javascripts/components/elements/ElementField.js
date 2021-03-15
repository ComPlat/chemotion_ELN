/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Col, Checkbox, Panel, Form, ButtonGroup, OverlayTrigger, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import { ButtonTooltip } from '../../admin/generic/Utils';

const ElementFieldTypes = [{ value: 'integer', name: 'integer', label: 'Integer' }, { value: 'text', name: 'text', label: 'Text' }, { value: 'select', name: 'select', label: 'Select' }, { value: 'checkbox', name: 'checkbox', label: 'Checkbox' }];
class ElementField extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handelDelete = this.handelDelete.bind(this);
    this.handleMove = this.handleMove.bind(this);
  }

  handleChange(e, orig, fe, lk, fc, tp) {
    this.props.onChange(e, orig, fe, lk, fc, tp);
  }
  handleMove(element) {
    const { l, f, isUp } = element;
    this.props.onMove(l, f, isUp);
  }

  handelDelete(delStr, delKey, delRoot) {
    this.props.onDelete(delStr, delKey, delRoot);
  }

  handleDrop(e) {
    this.props.onDrop(e);
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
        <Button bsSize="xs" bsStyle="danger" ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
      </OverlayTrigger>
    );
  }

  renderComponent() {
    const { unitsSystem } = this.props;
    const unitConfig = (unitsSystem.fields || []).map(_c =>
      ({ value: _c.field, name: _c.label, label: _c.label }));
    let typeOpts = this.props.genericType === 'Element' ? ElementFieldTypes.concat([{ value: 'drag_molecule', name: 'drag_molecule', label: 'DragMolecule' }, { value: 'drag_sample', name: 'drag_sample', label: 'DragSample' }]) : ElementFieldTypes;
    typeOpts = typeOpts.concat([{ value: 'system-defined', name: 'system-defined', label: 'System-Defined' }]);
    const skipRequired = this.props.genericType === 'Segment' ? { display: 'none' } : {};
    const f = this.props.field;
    const preUnit = unitConfig.length > 0 ? unitConfig[0].value : '';
    const selectOptions = (f.type === 'select' || f.type === 'system-defined') ? (
      <FormGroup controlId="formControlFieldType">
        <Col componentClass={ControlLabel} sm={3}>{f.type === 'select' ? 'Options' : <span />}</Col>
        <Col sm={9}>
          <Select
            className="drop-up"
            name={f.field}
            multi={false}
            options={f.type === 'select' ? this.props.select_options : unitConfig}
            value={f.option_layers || (f.type === 'select' ? '' : preUnit)}
            onChange={event => this.handleChange(event, f.option_layers, f.field, this.props.layerKey, 'option_layers', f.type)}
          />
        </Col>
      </FormGroup>)
      : (<div />);

    return (
      <div>
        <Panel>
          <Panel.Heading className="template_panel_heading">
            <Panel.Title toggle>
              {this.props.position}&nbsp;
              {f.field}
            </Panel.Title>
            <ButtonGroup bsSize="xsmall">
              <ButtonTooltip tip="Move Up" fnClick={this.handleMove} element={{ l: this.props.layerKey, f: f.field, isUp: true }} fa="fa-arrow-up" place="top" bs="default" disabled={this.props.position === 1} />
              <ButtonTooltip tip="Move Down" fnClick={this.handleMove} element={{ l: this.props.layerKey, f: f.field, isUp: false }} fa="fa-arrow-down" place="top" bs="default" />
              {this.renderDeleteButton('Field', f.field, this.props.layerKey)}
            </ButtonGroup>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <Form horizontal className="default_style">
                <FormGroup controlId={`frmCtrlField_${uuid.v4()}`}>
                  <Col componentClass={ControlLabel} sm={3}>Field Name</Col>
                  <Col sm={9}>
                    <FormControl
                      type="text"
                      name="f_field"
                      defaultValue={f.field}
                      disabled={!f.isNew}
                      onChange={event => this.handleChange(event, f.field, f.field, this.props.layerKey, 'field', 'text')}
                    />
                  </Col>
                </FormGroup>
                <FormGroup controlId={`frmCtrlFieldLabel_${uuid.v4()}`}>
                  <Col componentClass={ControlLabel} sm={3}>Display Name</Col>
                  <Col sm={9}>
                    <FormControl
                      type="text"
                      name="f_label"
                      defaultValue={f.label}
                      onChange={event => this.handleChange(event, f.label, f.field, this.props.layerKey, 'label', 'text')}
                    />
                  </Col>
                </FormGroup>
                <FormGroup controlId={`frmCtrlFieldInfo_${uuid.v4()}`}>
                  <Col componentClass={ControlLabel} sm={3}>Hover Info</Col>
                  <Col sm={9}>
                    <FormControl
                      type="text"
                      name="f_description"
                      defaultValue={f.description}
                      onChange={event => this.handleChange(event, f.description, f.field, this.props.layerKey, 'description', 'text')}
                    />
                  </Col>
                </FormGroup>
                <FormGroup controlId={`frmCtrlFieldType_${uuid.v4()}`}>
                  <Col componentClass={ControlLabel} sm={3}>Type</Col>
                  <Col sm={9}>
                    <Select
                      className="drop-up"
                      name={f.field}
                      multi={false}
                      options={typeOpts}
                      value={f.type}
                      onChange={event => this.handleChange(event, f.type, f.field, this.props.layerKey, 'type', 'select')}
                    />
                  </Col>
                </FormGroup>
                { selectOptions }
                <FormGroup controlId={`frmCtrlFieldRequired_${uuid.v4()}`} style={skipRequired}>
                  <Col componentClass={ControlLabel} sm={3}>
                    Required
                  </Col>
                  <Col sm={9}>
                    <Checkbox
                      inputRef={(m) => { this.accessLevelInput = m; }}
                      checked={f.required}
                      onChange={event => this.handleChange(event, f.required, f.field, this.props.layerKey, 'required', 'checkbox')}
                    />
                  </Col>
                </FormGroup>
                <FormGroup controlId={`frmCtrlFieldPlaceholder_${uuid.v4()}`} style={skipRequired}>
                  <Col componentClass={ControlLabel} sm={3}>
                    Placeholder
                  </Col>
                  <Col sm={9}>
                    <FormControl
                      type="text"
                      name="f_placeholder"
                      defaultValue={f.placeholder}
                      onChange={event => this.handleChange(event, f.placeholder, f.field, this.props.layerKey, 'placeholder', 'text')}
                    />
                  </Col>
                </FormGroup>
              </Form>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }

  render() {
    return (
      <Col md={12}>
        <Col md={12} sm={12}>
          {this.renderComponent()}
        </Col>
      </Col>
    );
  }
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
  unitsSystem: PropTypes.object
};

ElementField.defaultProps = { genericType: 'Element', unitsSystem: [] };

export { ElementField, ElementFieldTypes };
