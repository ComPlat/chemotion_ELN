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
      </Form>
    );
  }
}

LayerAttrForm.propTypes = {
  layer: PropTypes.object.isRequired,
};
