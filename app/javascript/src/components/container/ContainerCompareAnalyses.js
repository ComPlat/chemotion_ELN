import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, FormLabel, FormControl } from 'react-bootstrap';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import Select from 'react-select';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';
import { TreeSelect } from 'antd';
import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses } from 'src/utilities/SpectraHelper';

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

  componentDidUpdate(prevProps) {  
    if (prevProps.container !== this.props.container) {
      const { menuItems } = this.buildSelectAnalysesMenu();
      const extendedMetadata = this.props.container.extended_metadata || {};
      const analyses_compared = Array.isArray(extendedMetadata.analyses_compared) ? extendedMetadata.analyses_compared : [];
      const selectedFiles = analyses_compared.length > 0 ? analyses_compared.map((item) => item.file.id) : [];

      let selectedLayout = analyses_compared.length > 0 ? analyses_compared[0].layout : null;
      let filteredMenuItems = menuItems;
      if (selectedLayout) {
        filteredMenuItems = menuItems.filter(item => item.title === selectedLayout);
      }

      this.setState({
        container: this.props.container,
        menuItems: filteredMenuItems,
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
    const { container, selectedFilesIds } = this.state;
    const selectedData = GetSelectedComparedAnalyses(container, treeData, selectedFiles, info);
    let newSelectedFilesIds = [];
    if (selectedFilesIds.length < selectedFiles.length) {
      newSelectedFilesIds = Array.from(new Set([...selectedFilesIds, ...selectedFiles]));
    } else {
      newSelectedFilesIds = [...selectedFiles];
    }
    let selectedLayout = selectedData.length > 0 ? selectedData[0].layout : null;
    let { menuItems } = this.buildSelectAnalysesMenu();
    if (selectedLayout) {
      menuItems = menuItems.filter(item => item.title === selectedLayout);
    }

    this.setState({
        selectedFilesIds: newSelectedFilesIds,
        menuItems
    });
    container.extended_metadata.analyses_compared = selectedData;
    this.onChange(container);
  }

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  buildSelectAnalysesMenu() {
    const { sample, container } = this.props;
    const { menuItems, selectedFiles } = BuildSpectraComparedSelection(sample, container);
    return { menuItems, selectedFiles };
  }

  render() {
    const { container, menuItems, selectedFilesIds } = this.state;
    const { readOnly, disabled } = this.props;

    // Map status value to react-select option object for controlled value
    let selectedStatus = null;
    if (container && container.extended_metadata && container.extended_metadata.status) {
      selectedStatus = (confirmOptions || []).find(
        (opt) => opt && opt.value === container.extended_metadata.status
      ) || null;
    }

    return (
      <div>
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
              multi={false}
              options={confirmOptions}
              value={confirmOptions.find(opt => opt.value === this.state.container.extended_metadata.status) || null}
              disabled={readOnly || disabled}
              // eslint-disable-next-line react/jsx-no-bind
              onChange={this.handleInputChange.bind(this, 'status')}
            />
          </div>
        </Col>
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
}