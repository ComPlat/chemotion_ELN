import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col, FormLabel, FormControl, Row, Form, Button,
} from 'react-bootstrap';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { Select } from 'src/components/common/Select';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';
import { TreeSelect } from 'antd';
import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses } from 'src/utilities/SpectraHelper';

import ContainerDatasets from 'src/components/container/ContainerDatasets';
import Container from 'src/models/Container';
import QuillViewer from 'src/components/QuillViewer';
import AnalysisEditor from 'src/components/container/AnalysisEditor';
import HyperLinksSection from 'src/components/common/HyperLinksSection';

export default class ContainerCompareAnalyses extends Component {
  constructor(props) {
    super(props);

    const { container, templateType } = props;
    const textTemplate = TextTemplateStore.getState()[templateType] || Map();
    this.state = {
      container,
      selectedFilesIds: [],
      menuItems: null,
      textTemplate: textTemplate && textTemplate.toJS(),
      unsavedChanges: false,
      initialSelectedFilesIds: [],
    };

    this.onChange = this.onChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.handleTemplateChange = this.handleTemplateChange.bind(this);
    this.buildSelectAnalysesMenu = this.buildSelectAnalysesMenu.bind(this);
    this.handleChangeSelectAnalyses = this.handleChangeSelectAnalyses.bind(this);
    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);

  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);

    const { menuItems } = this.buildSelectAnalysesMenu();
    const { container } = this.props;
    const { analyses_compared } = container.extended_metadata || {};
    const selectedFiles = analyses_compared
      ? analyses_compared.map((item) => item.file.id)
      : [];

    this.setState({
      menuItems,
      selectedFilesIds: selectedFiles,
      initialSelectedFilesIds: selectedFiles,
    });
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

  getComparedIds(container) {
    if (!container?.extended_metadata?.analyses_compared) return [];
    return container.extended_metadata.analyses_compared
      .map(a => a.file?.id)
      .filter(Boolean)
      .sort();
  }

  componentDidUpdate(prevProps) {
    const prevList = prevProps.container?.extended_metadata?.analyses_compared || [];
    const currList = this.props.container?.extended_metadata?.analyses_compared || [];
  
    const prevIds = prevList.map(a => a.file.id).sort();
    const currIds = currList.map(a => a.file.id).sort();
  
    const idsChanged = JSON.stringify(prevIds) !== JSON.stringify(currIds);
  
    if (prevProps.container !== this.props.container || idsChanged) {
      const { menuItems, selectedFiles } = this.buildSelectAnalysesMenu(this.props.container);
  
      this.setState({
        container: this.props.container,
        menuItems,
        selectedFilesIds: selectedFiles,
        initialSelectedFilesIds: selectedFiles,
        unsavedChanges: false,
      });
    }
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

  handleChangeSelectAnalyses(treeData, selectedFiles, info) {
    const { container } = this.props;
  
    const selectedData = GetSelectedComparedAnalyses(container, treeData, selectedFiles, info);
  
    container.extended_metadata = container.extended_metadata || {};
    container.extended_metadata.analyses_compared = selectedData;

    if (selectedData.length > 0) {
      const layout = selectedData[0].layout;
      if (layout) {
        container.extended_metadata.kind = layout.replace(/^Type:\s*/i, '').trim();
      }
    } else {
      container.extended_metadata.kind = null;
    }

    const { menuItems } = this.buildSelectAnalysesMenu(container);

    const currentIds = selectedFiles.sort();
    const initialIds = this.state.initialSelectedFilesIds.sort();
    const hasChanges = JSON.stringify(currentIds) !== JSON.stringify(initialIds);

    this.setState({
      selectedFilesIds: selectedFiles,
      menuItems,
      unsavedChanges: hasChanges,
    });
  
    this.onChange(container);
  }

  handleSave() {
    const { handleSubmit } = this.props;
    if (handleSubmit) {
      handleSubmit();
    }
    this.setState((prevState) => ({
      unsavedChanges: false,
      initialSelectedFilesIds: prevState.selectedFilesIds,
    }));
  }

  handleReset() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to reset this comparison? This will remove all generated datasets and clear all fields.')) {
      return;
    }

    const { container, handleSubmit } = this.props;

    if (container.children && container.children.length > 0) {
      container.children.forEach(child => {
        child.is_deleted = true;
        child._destroy = true;
      });
    }

    container.description = '';
    container.preview_img = null;

    if (container.comparable_info) {
      container.comparable_info.layout = null;
      container.comparable_info.list_analyses = [];
      container.comparable_info.list_attachments = [];
      container.comparable_info.list_dataset = [];
    }
    
    if (container.extended_metadata) {
      container.extended_metadata.analyses_compared = [];
      container.extended_metadata.status = undefined;
      container.extended_metadata.content = { ops: [{ insert: '\n' }] };
      container.extended_metadata.hyperlinks = [];
      container.extended_metadata.kind = null;
    }

    const { menuItems } = this.buildSelectAnalysesMenu(container);
    
    this.setState({
      container,
      selectedFilesIds: [],
      initialSelectedFilesIds: [],
      menuItems,
      unsavedChanges: false,
    });

    this.onChange(container);
    
    if (handleSubmit) {
      handleSubmit();
    }
  }
  

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  buildSelectAnalysesMenu(currentContainer = this.props.container) {
    const { sample } = this.props;
  
    let { menuItems, selectedFiles } = BuildSpectraComparedSelection(sample, currentContainer);
  
    const selectedLayout = currentContainer.extended_metadata?.analyses_compared?.[0]?.layout ?? null;
  
    if (selectedLayout) {
      menuItems = menuItems.map((item) => {
        if (item.title !== selectedLayout) {
          return { ...item, disabled: true };
        }
        return item;
      });
    }
  
    return { menuItems, selectedFiles };
  }

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
    this.onChange(container);
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
    this.onChange(container);
  }


  render() {
    const { container, menuItems, selectedFilesIds, textTemplate } = this.state;
    const { readOnly, disabled } = this.props;
    const isComparison = container?.extended_metadata?.is_comparison;
    const attachments = container.attachments || [];
    const children = container.children || [];
    // Map status value to react-select option object for controlled value
    let selectedStatus = null;
    if (container && container.extended_metadata && container.extended_metadata.status) {
      selectedStatus = (confirmOptions || []).find(
        (opt) => opt && opt.value === container.extended_metadata.status
      ) || null;
    }

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
          onChangeContent={(e) => this.handleInputChange('content', e)}
        />
      );
    }

    return (
      <div>
        <Row>
          <Col md={8}>
            <label>Name</label>
            <FormControl
              type="text"
              label="Name"
              value={container.name || ''}
              // eslint-disable-next-line react/jsx-no-bind
              onChange={this.handleInputChange.bind(this, 'name')}
              disabled={readOnly || disabled} />
          </Col>
          <Col md={4}>
            <div style={{ marginBottom: 11 }}>
              <label>Status</label>
              <Select
                name='status'
                options={confirmOptions}
                value={confirmOptions.find(opt => opt.value === this.state.container.extended_metadata.status) || null}
                isDisabled={readOnly || disabled}
                // eslint-disable-next-line react/jsx-no-bind
                onChange={this.handleInputChange.bind(this, 'status')}
              />
            </div>
          </Col>
        </Row>
        <Col md={12}>
          <div style={{ marginBottom: 11 }}>
            <div className="d-flex align-items-center gap-3 mb-1">
              <FormLabel className="mb-1">Selection of datasets to be compared</FormLabel>
              {(isComparison && children.length > 0) ? (
                <Button
                  variant="danger"
                  size="xsm"
                  onClick={this.handleReset}
                  title="Reset comparison"
                  disabled={disabled}
                  className="px-2"
                >
                  <i className="fa fa-times me-1" />
                  Reset
                </Button>
              ) : (
                <Button
                  variant="warning"
                  size="xsm"
                  onClick={this.handleSave}
                  title="Save changes"
                  disabled={!this.state.unsavedChanges || disabled}
                  className="px-2"
                >
                  <i className="fa fa-check me-1" />
                  Apply
                </Button>
              )}
            </div>
            <TreeSelect
              style={{ width: '100%' }}
              placeholder="Please select"
              treeCheckable={true}
              value={selectedFilesIds}
              treeData={menuItems}
              getPopupContainer={triggerNode => triggerNode.parentNode}
              onChange={this.handleChangeSelectAnalyses.bind(this, menuItems)}
              disabled={disabled || (isComparison && children.length > 0)}
              maxTagCount={2}
            />
          </div>
        </Col>
        <Col md={12} className="mb-2">
          <Form.Group>
            <FormLabel>Content</FormLabel>
            {quill}
          </Form.Group>
          <Form.Group className="my-3">
            <FormLabel>Description</FormLabel>
            <FormControl
              as="textarea"
              rows={3}
              label="Description"
              value={container.description || ''}
              disabled={readOnly || disabled}
              // eslint-disable-next-line react/jsx-no-bind
              onChange={(e) => this.handleInputChange('description', e)}
            />
          </Form.Group>
        </Col>
        <Col md={12}>
          <div className="mt-3">
            <FormLabel>Datasets</FormLabel>
            <ContainerDatasets
              container={container}
              readOnly={readOnly}
              disabled={disabled}
              onChange={this.onChange}
              rootContainer={this.props.rootContainer}
              index={this.props.index}
              canAdd={false}
            />
          </div>
        </Col>
        <Col md={12}>
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


ContainerCompareAnalyses.propTypes = {
  templateType: PropTypes.string,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object,
  sample: PropTypes.object,
  handleSubmit: PropTypes.func,
  rootContainer: PropTypes.object,
  index: PropTypes.number,
}