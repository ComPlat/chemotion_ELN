import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import uuid from 'uuid';
import GenericElsFetcher from '../../components/fetchers/GenericElsFetcher';

export default class SegmentAttrForm extends Component {
  constructor() {
    super();
    this.state = { klassOptions: null };
  }

  componentDidMount() {
    GenericElsFetcher.fetchElementKlasses()
      .then((result) => {
        const klassOptions = result.klass.sort((a, b) => a.place - b.place)
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
            <InputGroup.Addon>Segment Label</InputGroup.Addon>
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
            <InputGroup.Addon>Assign to Element</InputGroup.Addon>
            <FormControl componentClass="select" value={element.element_klass && element.element_klass.id} inputRef={(ref) => { this.k_klass = ref; }} disabled={!editable} readOnly={!editable}>
              {klassOptions}
            </FormControl>
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlRepo">
          <InputGroup>
            <InputGroup.Addon>Transfer to Chemotion Repository</InputGroup.Addon>
            <FormControl type="text" defaultValue={element.identifier} inputRef={(ref) => { this.k_identifier = ref; }} />
          </InputGroup>
          <div className="help">
            <b>Transfer to Chemotion Repository: </b> Assign a Chemotion Repository Template Identifier for data transfer. You can find the released templates from<Button bsStyle="link" bsSize="xsmall" href="https://www.chemotion-repository.net" target="_blank">Chemotion Repoitory</Button>and copy/paste the identifier here.
          </div>
        </FormGroup>
      </Form>
    );
  }
}

SegmentAttrForm.propTypes = {
  element: PropTypes.object.isRequired, editable: PropTypes.bool.isRequired,
};
