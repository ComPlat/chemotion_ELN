import React, {Component} from 'react';
import {Col, FormControl,FormGroup, ControlLabel} from 'react-bootstrap';
import Select from 'react-select'
import ContainerDatasets from './ContainerDatasets';
import QuillEditor from './QuillEditor'

import {sampleAnalysesContentSymbol} from './utils/quillToolbarSymbol'
import {confirmOptions, kindOptions} from './staticDropdownOptions/options';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();
    const {container} = props;
    this.state = {
      container
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container
    });
  }

  handleInputChange(type, event) {
    const {container} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        container.name = value;
        break;
      case 'kind':
        container.extended_metadata['kind'] = value;
        break;
      case 'status':
        container.extended_metadata['status'] = value;
        break;
      case 'content':
        container.extended_metadata['content'] = value;
        break;
      case 'description':
        container.description = value;
        break;
    }
    this.props.onChange(container);

  }

  render() {
    const {container} = this.state;
    const {readOnly} = this.props;
    return (
      <div>
        <Col md={4}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={container.name || '***'}
            onChange={event => this.handleInputChange('name', event)}/>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='kind'
              multi={false}
              options={kindOptions}
              value={container.extended_metadata['kind']}
              disabled={readOnly}
              onChange={event => this.handleInputChange('kind',
                {target: {value: event && event.value}})}
              />
          </div>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Status</label>
            <Select
              name='status'
              multi={false}
              options={confirmOptions}
              value={container.extended_metadata['status']}
              disabled={readOnly}
              onChange={event => this.handleInputChange('status',
                {target: {value: event && event.value}})}
            />
          </div>
        </Col>
        <Col md={12}>
        <FormGroup>
          <ControlLabel>Content</ControlLabel>
          <QuillEditor value={container.extended_metadata['content']}
            onChange={event => this.handleInputChange('content', {target: {value: event}})}
            disabled={readOnly}
            toolbarSymbol={sampleAnalysesContentSymbol}
            />
        </FormGroup>
          <FormGroup>
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              label="Description"
              value={container.description || ''}
              disabled={readOnly}
              onChange={event => this.handleInputChange('description', event)}
              />
          </FormGroup>
        </Col>
        <Col md={12}>
          <label>Datasets</label>
          <ContainerDatasets
            container={container}
            readOnly={readOnly}
            onChange={container => this.props.onChange(container)}
            />
        </Col>
      </div>
    );
  }
}
