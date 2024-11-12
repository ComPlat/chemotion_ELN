import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Form, InputGroup, ButtonToolbar } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';

class ResearchPlanDetailsFieldTableSchemasModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      schemaNameValue: '',
      schemaNameError: ''
    };
  }

  handleSchemaNameChange(event) {
    this.setState({ schemaNameValue: event.target.value });
  }

  handleSubmit() {
    const { onSubmit } = this.props;
    const { schemaNameValue } = this.state;

    if (!schemaNameValue) {
      this.setState({ schemaNameError: 'Please give a schema name.' });
    } else {
      this.setState({ schemaNameError: '', schemaNameValue: '' });
      onSubmit(schemaNameValue);
    }
  }

  renderName(node) {
    const schema = node.data;
    return schema.name;
  }

  renderSchemaColumns(node) {
    const schema = node.data;
    return schema.value.columns.map(column => column.headerName).join(', ');
  }

  renderRows(node) {
    const schema = node.data;
    return schema.value.rows.length;
  }

  renderButtons(node) {
    const schema = node.data;
    return (
      <ButtonToolbar className=" justify-content-end gap-1">
        <Button variant="warning" size="sm" onClick={() => this.props.onUse(schema)}>
          Use
        </Button>
        <Button variant="danger" size="sm" onClick={() => this.props.onDelete(schema)}>
          Delete
        </Button>
      </ButtonToolbar>
    );
  }

  render() {
    const { modal, onHide } = this.props;
    const { schemaNameValue, schemaNameError } = this.state;

    const columnDefs = [
      {
        headerName: "Name",
        cellRenderer: this.renderName,
      },
      {
        headerName: "Columns",
        cellRenderer: this.renderSchemaColumns,
      },
      {
        headerName: "# Rows",
        cellRenderer: this.renderRows,
      },
      {
        headerName: "",
        cellRenderer: this.renderButtons,
        cellClass: ["p-2"],
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      autoHeight: true,
      sortable: false,
      resizable: false,
    };

    return (
      <Modal centered animation show={modal.show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            Table schemas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-5">
            <Form.Group>
              <Form.Label>Save current schema</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  value={schemaNameValue}
                  onChange={this.handleSchemaNameChange.bind(this)}
                />
                <Button variant="primary" onClick={this.handleSubmit.bind(this)}>
                  Save
                </Button>
              </InputGroup>
              <Form.Text className="text-danger">{schemaNameError}</Form.Text>
            </Form.Group>
          </div>
          <div className="ag-theme-alpine">
            <h4>Stored schemas</h4>
            <AgGridReact
              columnDefs={columnDefs}
              autoSizeStrategy={{ type: 'fitGridWidth' }}
              defaultColDef={defaultColDef}
              rowData={modal.schemas}
              domLayout="autoHeight"
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Button variant="light" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

ResearchPlanDetailsFieldTableSchemasModal.propTypes = {
  modal: PropTypes.object,
  onSubmit: PropTypes.func,
  onHide: PropTypes.func,
  onUse: PropTypes.func,
  onDelete: PropTypes.func
};

export default ResearchPlanDetailsFieldTableSchemasModal;
