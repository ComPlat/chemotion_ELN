import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';

export default class KlassAttrForm extends Component {
  render() {
    const { element, editable } = this.props;
    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlKlass">
          <InputGroup>
            <InputGroup.Addon>Klass</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.name} inputRef={(ref) => { this.k_name = ref; }} readOnly={!editable} />
          </InputGroup>
          <div className="help">
            Klass must be at least 3 characters long and can not be longer than 5 characters<br />
            Klass is only lowercase letters allowed<br />
            Klass should not contain special characters like $, !, %, etc.
          </div>
        </FormGroup>
        <FormGroup controlId="formControlPrefix">
          <InputGroup>
            <InputGroup.Addon>Prefix</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.klass_prefix} inputRef={(ref) => { this.k_prefix = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlLabel">
          <InputGroup>
            <InputGroup.Addon>Label</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.label} inputRef={(ref) => { this.k_label = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlIcon">
          <InputGroup>
            <InputGroup.Addon>Icon</InputGroup.Addon>
            {
              element.icon_name ?
                <InputGroup.Addon><i className={element.icon_name} /></InputGroup.Addon> : null
            }
            <FormControl type="text" defaultValue={element.icon_name} inputRef={(ref) => { this.k_iconname = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlDescription">
          <InputGroup>
            <InputGroup.Addon>Description</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.desc} inputRef={(ref) => { this.k_desc = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlKlassPlace">
          <InputGroup>
            <InputGroup.Addon>Sequential position</InputGroup.Addon>
            <FormControl type="number" defaultValue={element.place || 100} inputRef={(ref) => { this.k_place = ref; }} min={1} />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }
}

KlassAttrForm.propTypes = {
  element: PropTypes.object.isRequired,
  editable: PropTypes.bool.isRequired,
};
