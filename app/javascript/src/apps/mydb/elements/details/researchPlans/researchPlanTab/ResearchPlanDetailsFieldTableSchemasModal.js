import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Form,
  InputGroup,
  ButtonToolbar,
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import AppModal from 'src/components/common/AppModal';

class ResearchPlanDetailsFieldTableSchemasModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      schemaNameValue: '',
      schemaNameError: '',
    };
  }

  handleSchemaNameChange = (event) => {
    this.setState({ schemaNameValue: event.target.value });
  };

  handleSubmit = () => {
    const { onSubmit } = this.props;
    const { schemaNameValue } = this.state;

    if (!schemaNameValue) {
      this.setState({ schemaNameError: 'Please give a schema name.' });
    } else {
      this.setState({ schemaNameError: '', schemaNameValue: '' });
      onSubmit(schemaNameValue);
    }
  };

  static renderName(node) {
    const schema = node.data;
    return schema.name;
  }

  static renderSchemaColumns(node) {
    const schema = node.data;
    return schema.value.columns.map((column) => column.headerName).join(', ');
  }

  static renderRows(node) {
    const schema = node.data;
    return schema.value.rows.length;
  }

  renderButtons = (node) => {
    const { onUse, onDelete } = this.props;
    const schema = node.data;

    return (
      <ButtonToolbar className=" justify-content-end">
        <Button variant="warning" size="sm" onClick={() => onUse(schema)}>
          Use
        </Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(schema)}>
          Delete
        </Button>
      </ButtonToolbar>
    );
  };

  render() {
    const { modal, onHide } = this.props;
    const { schemaNameValue, schemaNameError } = this.state;

    const columnDefs = [
      {
        headerName: 'Name',
        cellRenderer: ResearchPlanDetailsFieldTableSchemasModal.renderName,
      },
      {
        headerName: 'Columns',
        cellRenderer: ResearchPlanDetailsFieldTableSchemasModal.renderSchemaColumns,
        wrapText: true,
        cellClass: ['lh-base', 'py-2'],
      },
      {
        headerName: '# Rows',
        cellRenderer: ResearchPlanDetailsFieldTableSchemasModal.renderRows,
      },
      {
        headerName: '',
        cellRenderer: this.renderButtons,
        cellClass: ['p-2'],
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      autoHeight: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
    };

    return (
      <AppModal
        show={modal.show}
        onHide={onHide}
        title="Table schemas"
        showFooter
        closeLabel="Close"
      >
        <div className="mb-5">
          <Form.Group>
            <Form.Label>Save current schema</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={schemaNameValue}
                onChange={this.handleSchemaNameChange}
              />
              <Button variant="primary" onClick={this.handleSubmit}>
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
            rowHeight="auto"
            domLayout="autoHeight"
          />
        </div>
      </AppModal>
    );
  }
}

ResearchPlanDetailsFieldTableSchemasModal.propTypes = {
  modal: PropTypes.shape({
    schemas: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      value: PropTypes.shape({
        columns: PropTypes.arrayOf(PropTypes.shape({
          headerName: PropTypes.string,
        })),
        rows: PropTypes.arrayOf(PropTypes.shape({})),
      }),
    })),
    show: PropTypes.bool.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
  onUse: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ResearchPlanDetailsFieldTableSchemasModal;
