import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, FormGroup, InputGroup, Button } from 'react-bootstrap';

export default class KlassAttrForm extends Component {
  render() {
    const { element, editable } = this.props;
    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlKlass">
          <InputGroup>
            <InputGroup.Addon>Element</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.name} inputRef={(ref) => { this.k_name = ref; }} readOnly={!editable} />
          </InputGroup>
          <div className="help">
            Element must be at least 3 characters long and can not be longer than 5 characters<br />
            Element is only lowercase letters allowed<br />
            Element should not contain special characters like $, !, %, etc.
          </div>
        </FormGroup>
        <FormGroup controlId="formControlPrefix">
          <InputGroup>
            <InputGroup.Addon>Prefix</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.klass_prefix} inputRef={(ref) => { this.k_prefix = ref; }} />
          </InputGroup>
          <div className="help">
            Prefix is used to define the prefix of Element label<br />
            Prefix should not contain special characters like $, !, %, etc.
          </div>
        </FormGroup>
        <FormGroup controlId="formControlLabel">
          <InputGroup>
            <InputGroup.Addon>Element Label</InputGroup.Addon>
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
          <div className="help">
            Icon is used to represent a particular element<br />
            Please use the icon code from<Button bsStyle="link" bsSize="xsmall" href="https://fontawesome.com/v4.7/icons/" target="_blank">Font Awesome 4</Button>
          </div>
        </FormGroup>
        <FormGroup controlId="formControlDescription">
          <InputGroup>
            <InputGroup.Addon>Description</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.desc} inputRef={(ref) => { this.k_desc = ref; }} />
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
