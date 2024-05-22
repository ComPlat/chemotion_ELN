/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import { Map } from 'immutable';
import PropTypes from 'prop-types';
import { Col, Form, Row } from 'react-bootstrap';
import Select from 'react-select';

import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

import ContainerDatasets from 'src/components/container/ContainerDatasets';
import QuillViewer from 'src/components/QuillViewer';
import OlsTreeSelect from 'src/components/OlsComponent';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';

import AnalysisEditor from 'src/components/container/AnalysisEditor';
import HyperLinksSection from 'src/components/common/HyperLinksSection';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

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

    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container,
    });
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.handleTemplateChange);
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

  handleAddLink(link) {
    const { container } = this.state;
    let { hyperlinks } = container.extended_metadata;
    if (hyperlinks == null) {
      container.extended_metadata.hyperlinks = [link];
    } else {
      if (typeof hyperlinks === 'string' || hyperlinks instanceof String) {
        hyperlinks = JSON.parse(hyperlinks);
      }

      hyperlinks.push(link);
      container.extended_metadata.hyperlinks = hyperlinks;
    }
    this.setState({ container });
  }

  handleRemoveLink(link) {
    const { container } = this.state;
    let { hyperlinks } = container.extended_metadata;
    if (typeof hyperlinks === 'string' || hyperlinks instanceof String) {
      hyperlinks = JSON.parse(hyperlinks);
    }

    const index = hyperlinks.indexOf(link);
    if (index !== -1) {
      hyperlinks.splice(index, 1);
      container.extended_metadata.hyperlinks = hyperlinks;
    }

    this.setState({ container });
  }

  onChange(container) {
    this.props.onChange(container);
  }

  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  render() {
    const { container, textTemplate } = this.state;
    const { readOnly, disabled } = this.props;

    let quill = (<span />);
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      );
    } else {
      quill = (
        <AnalysisEditor
          height="12em"
          template={textTemplate}
          analysis={container}
          updateTextTemplates={this.updateTextTemplates}
          // eslint-disable-next-line react/jsx-no-bind
          onChangeContent={this.handleInputChange.bind(this, 'content')}
        />
      );
    }

    return (
      <div>
        <Row>
          <Col sm={8} className='mb-2'>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <Form.Label>Name</Form.Label>
            < Form.Control
              type="text"
              label="Name"
              value={container.name}
              // eslint-disable-next-line react/jsx-no-bind
              onChange={this.handleInputChange.bind(this, 'name')}
              disabled={readOnly || disabled}
            />
          </Col>
          <Col sm={4} className='mb-2'>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <Form.Label>Status</Form.Label>
              <Select
                name="status"
                multi={false}
                options={confirmOptions}
                value={container.extended_metadata.status}
                disabled={readOnly || disabled}
                // eslint-disable-next-line react/jsx-no-bind
                onChange={this.handleInputChange.bind(this, 'status')}
              />
            </div>
          </Col>
        </Row>
        <Col sm={12} className='mb-2'>
          <div className='mb-3'>
            < Form.Label>{this.props.analysisMethodTitle}</Form.Label>
            <OlsTreeSelect
              selectName={this.props.ontologyName}
              selectedValue={container.extended_metadata.kind || ''}
              onSelectChange={(event) => this.handleInputChange('kind', event)}
              selectedDisable={readOnly || disabled || false}
            />
          </div>
        </Col>
        <Col sm={12} className='mb-2'>
          <Form.Group>
            <Form.Label>Content</Form.Label>
            {quill}
          </Form.Group>
          <Form.Group className='my-3'>
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              label="Description"
              value={container.description || ''}
              disabled={readOnly || disabled}
              // eslint-disable-next-line react/jsx-no-bind
              onChange={this.handleInputChange.bind(this, 'description')}
            />
          </Form.Group>
        </Col>
        <Col sm={12} >
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <Form.Label>Datasets</Form.Label>
          <ContainerDatasets
            container={container}
            readOnly={readOnly}
            disabled={disabled}
            onChange={this.onChange}
          />
        </Col>
        <Col sm={12}>
          <HyperLinksSection
            data={container.extended_metadata.hyperlinks ?? []}
            onAddLink={this.handleAddLink}
            onRemoveLink={this.handleRemoveLink}
            readOnly={readOnly}
            disabled={disabled}
          />
        </Col>
      </div>
    );
  }
}

ContainerComponent.propTypes = {
  ontologyName: PropTypes.string,
  analysisMethodTitle: PropTypes.string,
  templateType: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object
};

ContainerComponent.defaultProps = {
  ontologyName: 'chmo',
  analysisMethodTitle: 'Type (Chemical Methods Ontology)',
  templateType: '',
  onChange: () => {},
  readOnly: false,
  disabled: false,
  container: {}
};
