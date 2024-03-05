import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button, FormGroup, ControlLabel, FormControl, HelpBlock } from 'react-bootstrap';

class ResearchPlanDetailsFieldTableColumnNameModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      columnNameValue: '',
      columnNameError: ''
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      const { modal, columns } = this.props;

      let columnNameValue = '';
      if (modal.action === 'rename') {
        columnNameValue = columns.find(o => o.colId === modal.colId).headerName;
      }

      this.setState({
        columnNameValue,
        columnNameError: ''
      });
    }
  }

  handleColumnNameChange(event) {
    this.setState({ columnNameValue: event.target.value });
  }

  handleSubmit() {
    const { columns, onSubmit } = this.props;
    const { columnNameValue } = this.state;
    const keys = columns.map(column => column.headerName);

    if (!columnNameValue) {
      this.setState({ columnNameError: 'Please give a column name.' });
    } else if (keys.indexOf(columnNameValue) > -1) {
      this.setState({ columnNameError: 'A column with this title already exists.' });
    } else {
      this.setState({ columnNameError: '', columnNameValue: '' });
      onSubmit(columnNameValue);
    }
  }

  render() {
    const { modal, onHide } = this.props;
    const { columnNameValue, columnNameError } = this.state;

    let title;
    if (modal.action === 'insert') {
      title = 'Insert column';
    } else if (modal.action === 'rename') {
      title = 'Rename column';
    }

    const validationState = columnNameError ? 'error' : null;

    return (
      <Modal animation show={modal.show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body >
          <div>
            <FormGroup validationState={validationState}>
              <ControlLabel>Colum name</ControlLabel>
              <FormControl
                type="text"
                value={columnNameValue}
                onChange={this.handleColumnNameChange.bind(this)}
              />
              <HelpBlock>{columnNameError}</HelpBlock>
            </FormGroup>
          </div>
          <div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={onHide}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={this.handleSubmit.bind(this)}>
                {title}
              </Button>
            </ButtonToolbar>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

ResearchPlanDetailsFieldTableColumnNameModal.propTypes = {
  modal: PropTypes.object,
  columnName: PropTypes.string,
  onSubmit: PropTypes.func,
  onHide: PropTypes.func,
  columns: PropTypes.array
};

export default ResearchPlanDetailsFieldTableColumnNameModal;
