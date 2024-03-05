import React, { Component } from 'react';
import { Map } from 'immutable';
import PropTypes from 'prop-types';
import {
  Col,
  FormControl,
  FormGroup,
  ControlLabel
} from 'react-bootstrap';
import Select from 'react-select';

import TextTemplateStore from './stores/TextTemplateStore';
import TextTemplateActions from './actions/TextTemplateActions';

import ContainerDatasets from './ContainerDatasets';
import QuillViewer from './QuillViewer';
import OlsTreeSelect from './OlsComponent';
import { confirmOptions } from './staticDropdownOptions/options';

import AnalysisEditor from './AnalysisEditor';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();

    const { container, templateType } = props;
    const textTemplate = TextTemplateStore.getState()[templateType] || Map();
    this.state = {
      container,
      textTemplate: textTemplate && textTemplate.toJS()
    };

    this.onChange = this.onChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.handleTemplateChange = this.handleTemplateChange.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container,
    });
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.handleTemplateChange);
  }

  onChange(container) {
    this.props.onChange(container);
  }

  handleTemplateChange() {
    const { templateType } = this.props;

    const textTemplate = TextTemplateStore.getState()[templateType];
    this.setState({ textTemplate: textTemplate && textTemplate.toJS() });
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

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  render() {
    const { container, textTemplate } = this.state;
    const { readOnly, disabled } = this.props;

    let quill = (<span />);
    const { content } = container.extended_metadata;
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      );
    } else {
      quill = (
        <AnalysisEditor
          height="120px"
          template={textTemplate}
          analysis={container}
          updateTextTemplates={this.updateTextTemplates}
          onChangeContent={this.handleInputChange.bind(this, 'content')}
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
  templateType: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object
}
