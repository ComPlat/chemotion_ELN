import { AgGridReact } from 'ag-grid-react';
import { cloneDeep } from 'lodash';
import PropTypes from 'prop-types';
import Delta from 'quill-delta';
import React from 'react';
import { Button, Form, Container, Col, InputGroup, Row } from 'react-bootstrap';

import QuillEditor from 'src/components/QuillEditor';
import TextTemplateIcon from 'src/apps/admin/textTemplates/TextTemplateIcon';

function RemoveRowBtn({ removeRow, node }) {
  const { data } = node;

  const btnClick = () => {
    removeRow(data.name);
  };

  return (
    <Button
      active
      onClick={btnClick}
      size='xxsm'
      variant="danger"
      className='mt-1'
    >
      <i className="fa fa-trash" />
    </Button>
  );
}

RemoveRowBtn.propTypes = {
  removeRow: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

function AddRowBtn({ addRow }) {
  return (
    <Button
      active
      onClick={() => addRow()}
      size="xxsm"
      variant="primary"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

AddRowBtn.propTypes = {
  addRow: PropTypes.func.isRequired,
};

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
        headerComponent: AddRowBtn,
        headerComponentParams: {
          addRow: this.addRow
        },
        cellRenderer: RemoveRowBtn,
        cellRendererParams: {
          removeRow: this.removeRow,
        },
        editable: false,
        filter: false,
        width: 35,
      },
    ];
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(newProps) {
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
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  onGridReady(e) {
    if (!e.api) return;
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  onSelectionChanged() {
    if (!this.gridApi) return;

    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

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
    const { fetchedTemplates, updateTemplate } = this.props;
    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === oldValue
    ));
    if (selectedNameIdx < 0) return;

    const selectedTemplate = cloneDeep(fetchedTemplates[selectedNameIdx]);
    selectedTemplate.name = newValue;
    updateTemplate(selectedTemplate);
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

    const quill = this.reactQuillRef.current;
    const delta = quill.getContents();

    // Quill automatically append a trailing newline, we don't want that
    // Remove it !!!
    const deltaLength = delta.length();
    const removeTrailingNewline = new Delta().retain(deltaLength - 1).delete(1);
    const content = delta.compose(removeTrailingNewline);

    const selectedTemplate = cloneDeep(this.state.selectedTemplate);
    selectedTemplate.data.ops = content.ops;
    this.props.updateTemplate(selectedTemplate);
  }

  removeRow(name) {
    const { removeTemplate } = this.props;
    removeTemplate(name);
    this.setState({ selectedTemplate: null });
  }

  addRow() {
    const { addTemplate } = this.props;
    addTemplate(this.gridApi);
  }

  handleInputChange = () => {}

  render() {
    const { predefinedTemplateNames } = this.props;
    const { selectedTemplate, text, icon } = this.state;

    return (
      <Container fluid className="vh-100">
        <Row className="vh-100">
          <Col md={4}>
            <div className="h-100 d-flex flex-column">
              <div className="ag-theme-balham flex-grow-1 py-4">
                <AgGridReact
                  suppressHorizontalScroll
                  columnDefs={this.columnDefs}
                  defaultColDef
                  rowSelection="single"
                  onGridReady={this.onGridReady}
                  onSelectionChanged={this.onSelectionChanged}
                  rowData={predefinedTemplateNames}
                  className='fs-6'
                  rowHeight={35}
                />
              </div>
            </div>
          </Col>
          <Col md={8}>
            <div className="p-3">
              <InputGroup className="mb-3">
                <InputGroup.Text className='fs-5 fw-bold me-3'>Preview</InputGroup.Text>
                <TextTemplateIcon className='fs-3 my-3' template={selectedTemplate} />
              </InputGroup>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className='fw-bold fs-5'>Text</Form.Label>
                  <Form.Control
                    type="text"
                    value={text}
                    onChange={selectedTemplate ? this.onChangeText : () => { }}
                    className='py-3'
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className='fw-bold fs-5'>Icon</Form.Label>
                  <Form.Control
                    type="text"
                    value={icon}
                    onChange={selectedTemplate ? this.onChangeIcon : () => { }}
                    className='py-3'
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <QuillEditor
                    ref={this.reactQuillRef}
                    value={(selectedTemplate || {}).data}
                    onChange={event => this.handleInputChange(event)}
                  />
                </Form.Group>
              </Form>
              <Button variant="primary" onClick={selectedTemplate ? this.saveTemplate : () => { }}>
                Save
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

TextTemplate.propTypes = {
  predefinedTemplateNames: PropTypes.arrayOf(PropTypes.object),
  // eslint-disable-next-line react/forbid-prop-types
  fetchedTemplates: PropTypes.arrayOf(PropTypes.object),
  fetchTemplate: PropTypes.func.isRequired,
  addTemplate: PropTypes.func.isRequired,
  updateTemplate: PropTypes.func.isRequired,
  removeTemplate: PropTypes.func.isRequired,
};

TextTemplate.defaultProps = {
  predefinedTemplateNames: [],
  fetchedTemplates: [],
};
