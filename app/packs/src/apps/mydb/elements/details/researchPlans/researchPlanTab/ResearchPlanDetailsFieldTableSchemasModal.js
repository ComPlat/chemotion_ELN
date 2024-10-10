import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Modal, Button, Form, InputGroup, ButtonToolbar } from 'react-bootstrap';

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

  render() {
    const {
      modal, onHide, onUse, onDelete
    } = this.props;
    const { schemaNameValue, schemaNameError } = this.state;

    let schemaTable = null;
    if (modal.schemas) {
      schemaTable = modal.schemas.map((schema, index) => (
        <tr key={index}>
          <td>{schema.name}</td>
          <td>
            {schema.value.columns.map(column => column.headerName).join(', ')}
          </td>
          <td className="px-3">
            {schema.value.rows.length}
          </td>
          <td>
            <ButtonToolbar className=" justify-content-end gap-1">
              <Button variant="warning" size="sm" onClick={() => onUse(schema)}>
                Use
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(schema)}>
                Delete
              </Button>
            </ButtonToolbar>
          </td>
        </tr>
      ));
    }

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
          <div>
            <h4>Stored schemas</h4>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Columns</th>
                  <th># Rows</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {schemaTable}
              </tbody>
            </Table>
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
