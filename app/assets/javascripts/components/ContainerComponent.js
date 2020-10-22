import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, FormControl, FormGroup, ControlLabel
} from 'react-bootstrap';
import Select from 'react-select';
import _ from 'lodash';
import ContainerDatasets from './ContainerDatasets';
import QuillEditor from './QuillEditor';
import QuillViewer from './QuillViewer';
import OlsTreeSelect from './OlsComponent';
import { sampleAnalysesContentSymbol, sampleAnalysesContentDropdown } from './utils/quillToolbarSymbol';
import { formatAnalysisContent } from './utils/ElementUtils';
import { confirmOptions } from './staticDropdownOptions/options';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();
    const { container } = props;
    this.state = {
      container,
    };

    this.onChange = this.onChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.reformatContent = this.reformatContent.bind(this);
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
      case 'kind': {
        let kind = (ev || '');
        kind = `${kind.split('|')[0].trim()} | ${(kind.split('|')[1] || '').trim()}`;
        container.extended_metadata.kind = kind;
        isChanged = true;
        break;
      }
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

  reformatContent() {
    const { container } = this.state;

    container.extended_metadata.content = formatAnalysisContent(container);
    this.onChange(container);
  }

  render() {
    const { container } = this.state;
    const { readOnly, disabled } = this.props;

    const formatButton = (
      <Button bsSize="xsmall" onClick={this.reformatContent}>
        <i className="fa fa-magic" />
      </Button>
    );

    let quill = (<span />);
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      );
    } else {
      quill = (
        <QuillEditor
          height="120px"
          value={container.extended_metadata.content}
          onChange={this.handleInputChange.bind(this, 'content')}
          disabled={readOnly}
          toolbarSymbol={sampleAnalysesContentSymbol}
          toolbarDropdown={sampleAnalysesContentDropdown}
          customToolbar={formatButton}
        />
      );
    }

    return (
      <div>
        <Col md={8}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={container.name || '***'}
            onChange={this.handleInputChange.bind(this, 'name')}
            disabled={readOnly || disabled} />
        </Col>
        <Col md={4}>
          <div style={{ marginBottom: 11 }}>
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
          <div style={{ marginBottom: 11 }}>
            <ControlLabel>Type (Chemical Methods Ontology)</ControlLabel>
            <OlsTreeSelect
              selectName="chmo"
              selectedValue={container.extended_metadata['kind'] || ''}
              onSelectChange={event => this.handleInputChange('kind', event)}
              selectedDisable={readOnly || disabled || false}
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
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object
}
