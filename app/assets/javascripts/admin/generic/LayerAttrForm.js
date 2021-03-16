import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';

export default class LayerAttrForm extends Component {
  render() {
    const { layer } = this.props;
    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlLayerKey">
          <InputGroup>
            <InputGroup.Addon>Name</InputGroup.Addon>
            <FormControl type="text" defaultValue={layer.key} inputRef={(ref) => { this.lf_layerKey = ref; }} readOnly={!!layer.key} />
          </InputGroup>
          <div className="help">
            Layer name is unique in the template<br />
            Layer name must contain only lowercase letters and underscores<br />
            Layer name should not contain special characters like $, !, %, etc.
          </div>
        </FormGroup>
        <FormGroup controlId="formControlLayerLabel">
          <InputGroup>
            <InputGroup.Addon>Display name</InputGroup.Addon>
            <FormControl type="text" defaultValue={layer.label} inputRef={(ref) => { this.lf_label = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlLayerCols">
          <InputGroup>
            <InputGroup.Addon>Columns per row</InputGroup.Addon>
            <FormControl type="number" defaultValue={layer.cols} inputRef={(ref) => { this.lf_cols = ref; }} min={1} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlLayerPosition">
          <InputGroup>
            <InputGroup.Addon>Sequential position</InputGroup.Addon>
            <FormControl type="number" defaultValue={layer.position} inputRef={(ref) => { this.lf_position = ref; }} min={1} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlLayerCondition">
          <InputGroup>
            <InputGroup.Addon>Restriction</InputGroup.Addon>
            <FormControl type="text" defaultValue={layer.condition} inputRef={(ref) => { this.lf_condition = ref; }} />
          </InputGroup>
          <div className="help">
            Set layer present conditions<br />
            Restriction should be in the format as &apos;layer name, field name, field value&apos;<br />
            E.g. my_layer,my_field,1000
          </div>
        </FormGroup>
        <FormGroup controlId="formControlLayerColor">
          <InputGroup>
            <InputGroup.Addon>Header color</InputGroup.Addon>
            <FormControl componentClass="select" defaultValue={layer.color} inputRef={(ref) => { this.lf_color = ref; }} >
              <option value="none">none</option>
              <option value="default">Grey</option>
              <option value="success">Green</option>
              <option value="warning">Yellow</option>
              <option value="primary">Blue</option>
              <option value="info">Light Blue</option>
              <option value="danger">Red</option>
            </FormControl>
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formCtlHeaderStyle">
          <InputGroup>
            <InputGroup.Addon>Style Option</InputGroup.Addon>
            <FormControl componentClass="select" defaultValue={layer.style} inputRef={(ref) => { this.lf_style = ref; }} >
              <option value="panel_generic_heading">bold</option>
              <option value="panel_generic_heading_bu">bold/underline</option>
              <option value="panel_generic_heading_bui">bold/underline/italic</option>
            </FormControl>
          </InputGroup>
        </FormGroup>

      </Form>
    );
  }
}

LayerAttrForm.propTypes = {
  layer: PropTypes.object.isRequired,
};
