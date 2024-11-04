import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Modal, Button, FormGroup, ControlLabel, FormControl, HelpBlock, InputGroup } from 'react-bootstrap';

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
      schemaTable = modal.schemas.map((schema, index) => {
        return (
          <tr key={index}>
            <td>{schema.name}</td>
            <td>
              {schema.value.columns.map(column => column.headerName).join(', ')}
            </td>
            <td>
              {schema.value.rows.length}
            </td>
            <td>
              <Button bsStyle="danger" bsSize="xsmall" onClick={() => onDelete(schema)}>
                Delete
              </Button>
              <Button bsStyle="warning" bsSize="xsmall" onClick={() => onUse(schema)}>
                Use
              </Button>
            </td>
          </tr>
        );
      });
    }

    return (
      <Modal animation show={modal.show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            Table schemas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body >
          <div className="research-plan-table-schema-modal-create">
            <FormGroup validationState={schemaNameError ? 'error' : null}>
              <ControlLabel>Save current schema</ControlLabel>
              <InputGroup>
                <FormControl
                  type="text"
                  value={schemaNameValue}
                  onChange={this.handleSchemaNameChange.bind(this)}
                />
                <InputGroup.Button>
                  <Button bsStyle="success" onClick={this.handleSubmit.bind(this)}>
                    Save
                  </Button>
                </InputGroup.Button>
              </InputGroup>
              <HelpBlock>{schemaNameError}</HelpBlock>
            </FormGroup>
          </div>
          <div className="research-plan-table-schema-modal-table">
            <h4>Stored schemas</h4>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Name</th>
                  <th style={{ width: '40%' }}>Columns</th>
                  <th style={{ width: '20%' }}># Rows</th>
                  <th style={{ width: '20%' }} />
                </tr>
              </thead>
              <tbody>
                {schemaTable}
              </tbody>
            </Table>
          </div>
          <div>
            <Button bsStyle="default" onClick={onHide}>
              Close
            </Button>
          </div>
        </Modal.Body>
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
