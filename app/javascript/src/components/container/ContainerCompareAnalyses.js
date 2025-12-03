import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, FormLabel, FormControl, Row } from 'react-bootstrap';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { Select } from 'src/components/common/Select';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';
import { TreeSelect } from 'antd';
import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses } from 'src/utilities/SpectraHelper';

import ContainerDatasets from 'src/components/container/ContainerDatasets';
import Container from 'src/models/Container';

export default class ContainerCompareAnalyses extends Component {
  constructor(props) {
    super(props);

    const { container, templateType } = props;
    const textTemplate = TextTemplateStore.getState()[templateType] || Map();
    this.state = {
      container,
      selectedFilesIds: [],
      menuItems: null,
      textTemplate: textTemplate && textTemplate.toJS()
    };

    this.onChange = this.onChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.handleTemplateChange = this.handleTemplateChange.bind(this);
    this.buildSelectAnalysesMenu = this.buildSelectAnalysesMenu.bind(this);
    this.handleChangeSelectAnalyses = this.handleChangeSelectAnalyses.bind(this);

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
      selectedFilesIds: selectedFiles
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
      const updatedContainer = this.props.container;
  
      let { menuItems, selectedFiles } =
        BuildSpectraComparedSelection(this.props.sample, updatedContainer);
  
      this.setState({
        container: updatedContainer,
        menuItems,
        selectedFilesIds: selectedFiles
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
  
    this.setState({
      selectedFilesIds: selectedFiles,
    });
  
    this.onChange(container);
  }
  

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  buildSelectAnalysesMenu() {
    const { sample, container } = this.props;
  
    let { menuItems, selectedFiles } = BuildSpectraComparedSelection(sample, container);
  
    const selectedLayout = container.extended_metadata?.analyses_compared?.[0]?.layout ?? null;
  
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
  

  render() {
    const { container, menuItems, selectedFilesIds } = this.state;
    const { readOnly, disabled } = this.props;
    const attachments = container.attachments || [];

    // Map status value to react-select option object for controlled value
    let selectedStatus = null;
    if (container && container.extended_metadata && container.extended_metadata.status) {
      selectedStatus = (confirmOptions || []).find(
        (opt) => opt && opt.value === container.extended_metadata.status
      ) || null;
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
            <FormLabel>Analyses</FormLabel>
            <TreeSelect
              style={{ width: '100%' }}
              placeholder="Please select"
              treeCheckable={true}
              value={selectedFilesIds}
              treeData={menuItems}
              getPopupContainer={triggerNode => triggerNode.parentNode}
              onChange={this.handleChangeSelectAnalyses.bind(this, menuItems)}
            />
          </div>
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
            />
          </div>
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