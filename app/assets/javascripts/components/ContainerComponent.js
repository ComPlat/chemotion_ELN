import React, { Component } from 'react';
import { Col, FormControl, FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';
import ContainerDatasets from './ContainerDatasets';
import QuillEditor from './QuillEditor';
import QuillViewer from './QuillViewer';

import { sampleAnalysesContentSymbol } from './utils/quillToolbarSymbol';
import { confirmOptions, kindOptions } from './staticDropdownOptions/options';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();
    const { container } = props;
    this.state = {
      container,
    };

    this.onChange = this.onChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container,
    });
  }

  onChange(container) {
    this.props.onChange(container);
  }

  handleInputChange(type, ev) {
    const { container } = this.state;
    let isChanged = false;

    switch (type) {
      case 'name':
        container.name = ev.currentTarget.value;
        isChanged = true;
        break;
      case 'description':
        container.description = ev.currentTarget.value;
        isChanged = true;
        break;
      case 'kind':
        container.extended_metadata.kind = ev ? ev.value : undefined;
        isChanged = true;
        break;
      case 'status':
        container.extended_metadata.status = ev ? ev.value : undefined;
        isChanged = true;
        break;
      case 'content':
        container.extended_metadata.content = ev;
        isChanged = true;
        break;
      default:
        break;
    }

    if (isChanged) this.onChange(container);
  }

  render() {
    const { container } = this.state;
    const { readOnly, disabled } = this.props;

    let quill = (<span />);
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      )
    } else {
      quill = (
        <QuillEditor
          height="120px"
          value={container.extended_metadata.content}
          onChange={this.handleInputChange.bind(this, 'content')}
          disabled={readOnly}
          toolbarSymbol={sampleAnalysesContentSymbol}
        />
      )
    }

    return (
      <div>
        <Col md={4}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={container.name || '***'}
            onChange={this.handleInputChange.bind(this, 'name')}
            disabled={disabled}/>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='kind'
              multi={false}
              options={kindOptions}
              value={container.extended_metadata['kind']}
              disabled={readOnly || disabled}
              onChange={this.handleInputChange.bind(this, 'kind')}
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
              disabled={readOnly || disabled}
              onChange={this.handleInputChange.bind(this, 'status')}
            />
          </div>
        </Col>
        <Col md={12}>
        <FormGroup>
          <ControlLabel>Content</ControlLabel>
          {quill}
        </FormGroup>
          <FormGroup>
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              label="Description"
              value={container.description || ''}
              disabled={readOnly || disabled}
              onChange={this.handleInputChange.bind(this, 'description')}
              />
          </FormGroup>
        </Col>
        <Col md={12}>
          <label>Datasets</label>
          <ContainerDatasets
            container={container}
            readOnly={readOnly}
            disabled={disabled}
            onChange={this.onChange}
            />
        </Col>
      </div>
    );
  }
}

ContainerComponent.propTypes = {
  onChange: React.PropTypes.func,
  readOnly: React.PropTypes.bool,
  disabled: React.PropTypes.bool,
  container: React.PropTypes.object
}
