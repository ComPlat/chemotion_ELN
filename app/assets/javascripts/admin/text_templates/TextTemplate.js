import { AgGridReact } from 'ag-grid-react';
import { cloneDeep } from 'lodash';
import PropTypes from 'prop-types';
import Delta from 'quill-delta';
import React from 'react';
import {
  Button, ControlLabel,
  Form, FormControl,
  Panel
} from 'react-bootstrap';

import ReactQuill from '../../components/react_quill/ReactQuill';
import TextTemplatesFetcher from '../../components/fetchers/TextTemplatesFetcher';
import ToolbarIcon from './ToolbarIcon';
import ActionHeaderBtn from './ActionHeaderBtn';
import ActionRowBtn from './ActionRowBtn';

export default class TextTemplate extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedTemplate: null,
      text: '',
      icon: ''
    };

    this.reactQuillRef = React.createRef();

    this.onSelectionChanged = this.onSelectionChanged.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.onCellValueChanged = this.onCellValueChanged.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.onChangeIcon = this.onChangeIcon.bind(this);
    // this.onSaveTemplate = this.onSaveTemplate.bind(this);

    this.saveTemplate = this.saveTemplate.bind(this);
    this.removeRow = this.removeRow.bind(this);
    this.addRow = this.addRow.bind(this);

    this.columnDefs = [
      {
        field: 'name',
        editable: true,
        minWidth: 150,
        onCellValueChanged: this.onCellValueChanged
      },
      {
        headerName: '',
        colId: 'actions',
        headerComponentFramework: ActionHeaderBtn,
        headerComponentParams: {
          addRow: this.addRow
        },
        cellRendererFramework: ActionRowBtn,
        cellRendererParams: {
          removeRow: this.removeRow,
          saveRow: this.saveRow
        },
        editable: false,
        filter: false,
        width: 35,
      },
    ];
  }

  componentWillReceiveProps(newProps) {
    const { fetchedTemplates } = newProps;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === selectedRows[0].name
    ));

    if (selectedNameIdx < 0) return;

    const newSelectedTemplate = cloneDeep(fetchedTemplates[selectedNameIdx]);
    this.setState({
      selectedTemplate: cloneDeep(newSelectedTemplate),
      text: newSelectedTemplate.data.text || '',
      icon: newSelectedTemplate.data.icon || ''
    });
  }

  componentDidUpdate() {
    if (!this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  onGridReady(e) {
    e.api.sizeColumnsToFit();
    this.gridApi = e.api;
  }

  onSelectionChanged() {
    if (!this.gridApi) return;

    const selectedRows = this.gridApi.getSelectedRows();
    const templateName = selectedRows[0].name;

    const { fetchedTemplates } = this.props;
    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === templateName
    ));

    if (selectedNameIdx >= 0) {
      const selectedTemplate = cloneDeep(fetchedTemplates[selectedNameIdx]);
      this.setState({
        selectedTemplate,
        text: selectedTemplate.data.text || '',
        icon: selectedTemplate.data.icon || ''
      });
    } else {
      const { fetchTemplate } = this.props;
      fetchTemplate(templateName);
    }
  }

  onCellValueChanged(params) {
    const { oldValue, newValue } = params;
    const { fetchedTemplates } = this.state;
    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === oldValue
    ));
    if (selectedNameIdx < 0) return;

    const selectedTemplate = cloneDeep(fetchedTemplates[selectedNameIdx]);
    selectedTemplate.name = newValue;
    TextTemplatesFetcher.updateTextTemplates('predefinedTextTemplate', selectedTemplate).then((res) => {
      if (!res) return;

      this.setState({
        fetchedTemplates: fetchedTemplates.map((t, idx) => (
          (idx === selectedNameIdx) ? selectedTemplate : t
        ))
      });
    });
  }

  onChangeText(e) {
    const { selectedTemplate } = this.state;
    const { value } = e.target;
    selectedTemplate.data.text = value;

    this.setState({
      text: value,
      selectedTemplate
    });
  }

  onChangeIcon(e) {
    const { selectedTemplate } = this.state;
    const { value } = e.target;
    selectedTemplate.data.icon = value;

    this.setState({ icon: value, selectedTemplate });
  }

  saveTemplate() {
    if (this.reactQuillRef.current == null) {
      return;
    }

    const quill = this.reactQuillRef.current.getEditor();
    const delta = quill.getContents();

    const { selectedTemplateName, fetchedTemplates } = this.state;
    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === selectedTemplateName
    ));
    if (selectedNameIdx < 0) return;

    const selectedTemplate = cloneDeep(fetchedTemplates[selectedNameIdx]);
    selectedTemplate.data.ops = delta.ops;
    TextTemplatesFetcher.updateTextTemplates('predefinedTextTemplate', selectedTemplate).then((res) => {
      if (!res) return;

      this.setState({
        fetchedTemplates: fetchedTemplates.map((t, idx) => (
          (idx === selectedNameIdx) ? selectedTemplate : t
        ))
      });
    });
  }

  removeRow(name) {
    const { removeTemplate } = this.props;
    console.log(name);
    // TextTemplatesFetcher.deletePredefinedTemplateByName(name).then((res) => {
    //   if (!res) return;

    //   const { fetchedTemplates, predefinedTemplateNames } = this.props;
    //   this.setState({
    //     fetchedTemplates: fetchedTemplates.filter(t => t.name !== name),
    //     predefinedTemplateNames: predefinedTemplateNames.filter(t => (
    //       t.name !== name
    //     ))
    //   });
    // });
  }

  saveRow(name) {
  }

  addRow() {
    const { predefinedTemplateNames, fetchedTemplates } = this.state;

    this.setState({
      predefinedTemplateNames: [{ name: '' }, ...predefinedTemplateNames],
      fetchedTemplates: [
        { name: '', data: {} },
        ...fetchedTemplates
      ]
    }, () => {
      if (!this.gridApi) return;
      this.gridApi.startEditingCell({ rowIndex: 0, colKey: 'name' });
    });
  }

  render() {
    const { predefinedTemplateNames } = this.props;
    const { selectedTemplate, text, icon } = this.state;

    let quillDelta;
    if (selectedTemplate) {
      const { ops } = selectedTemplate.data;
      quillDelta = new Delta({ ops });
    }

    return (
      <Panel style={{ height: 'calc(100vh - 150px)' }}>
        <Panel.Body style={{ height: '100%' }}>
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ width: '35%' }}>
              <div style={{ height: '100%' }} className="ag-theme-balham">
                <AgGridReact
                  enableColResize
                  pagination
                  paginationAutoPageSize
                  suppressHorizontalScroll
                  columnDefs={this.columnDefs}
                  rowSelection="single"
                  onGridReady={this.onGridReady}
                  onSelectionChanged={this.onSelectionChanged}
                  rowData={predefinedTemplateNames}
                />
              </div>
            </div>
            <div style={{ marginLeft: '10px', width: '65%' }}>
              <div style={{ margin: '10px' }}>
                <ControlLabel style={{ width: '65px' }}>
                  Preview
                </ControlLabel>
                &nbsp;
                <ToolbarIcon template={selectedTemplate} />
              </div>
              <div style={{ margin: '10px' }}>
                <Form inline>
                  <ControlLabel style={{ width: '65px' }}>Text</ControlLabel>
                  <FormControl value={text} onChange={this.onChangeText} />
                </Form>
              </div>
              <div style={{ margin: '10px 10px 20px 10px' }}>
                <Form inline>
                  <ControlLabel style={{ width: '65px' }}>Icon</ControlLabel>
                  <FormControl value={icon} onChange={this.onChangeIcon} />
                </Form>
              </div>
              <div>
                <ReactQuill
                  modules={this.modules}
                  theme="snow"
                  style={{ height: '120px' }}
                  ref={this.reactQuillRef}
                  value={quillDelta}
                />
              </div>
              &nbsp;&nbsp;
              <div style={{ marginTop: '30px' }}>
                <Button bsStyle="primary" onClick={this.saveTemplate}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </Panel.Body>
      </Panel>
    );
  }
}

TextTemplate.propTypes = {
  predefinedTemplateNames: PropTypes.arrayOf(PropTypes.object),
  // eslint-disable-next-line react/forbid-prop-types
  fetchedTemplates: PropTypes.arrayOf(PropTypes.object),
  fetchTemplate: PropTypes.func.isRequired,
};

TextTemplate.defaultProps = {
  predefinedTemplateNames: [],
  fetchedTemplates: [],
};
