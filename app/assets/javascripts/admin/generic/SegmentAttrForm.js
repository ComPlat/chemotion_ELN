import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import uuid from 'uuid';
import AdminFetcher from '../../components/fetchers/AdminFetcher';

export default class SegmentAttrForm extends Component {
  constructor() {
    super();
    this.state = { klassOptions: null };
  }

  componentDidMount() {
    AdminFetcher.fetchElementKlasses()
      .then((result) => {
        const klassOptions = result.klass.filter(k => !k.is_generic)
          .sort((a, b) => a.place - b.place)
          .map(k => (<option key={uuid.v4()} value={k.id}>{k.label}</option>));
        this.setState({ klassOptions });
      });
  }

  render() {
    const { element, editable } = this.props;
    const { klassOptions } = this.state;
    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlLabel">
          <InputGroup>
            <InputGroup.Addon>Label</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.label} inputRef={(ref) => { this.k_label = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlDescription">
          <InputGroup>
            <InputGroup.Addon>Description</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.desc} inputRef={(ref) => { this.k_desc = ref; }} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlAssignKlass">
          <InputGroup>
            <InputGroup.Addon>Assign to Klass</InputGroup.Addon>
            <FormControl componentClass="select" value={element.element_klass && element.element_klass.id} inputRef={(ref) => { this.k_klass = ref; }} disabled={!editable} readOnly={!editable}>
              {klassOptions}
            </FormControl>
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlSegmentPlace">
          <InputGroup>
            <InputGroup.Addon>Sequential position</InputGroup.Addon>
            <FormControl type="number" defaultValue={element.place || 100} inputRef={(ref) => { this.k_place = ref; }} min={1} />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }
}

SegmentAttrForm.propTypes = {
  element: PropTypes.object.isRequired,
  editable: PropTypes.bool.isRequired,
};
