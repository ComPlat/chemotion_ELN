import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button, Form } from 'react-bootstrap';
import { COLUMN_ID_SHORT_LABEL_SAMPLE, COLUMN_ID_SHORT_LABEL_REACTION } from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableUtils';
class ResearchPlanDetailsFieldTableColumnNameModal extends Component {
  constructor(props) {
    super(props);
    const { columns, colId } = this.props;
    this.state = {
      columnNameValue: '',
      columnNameError: '',
      linkSampleShortLabel: colId === COLUMN_ID_SHORT_LABEL_SAMPLE,
      linkSampleShortLabelAvailable: !columns.some(col => col.colId !== colId && col.colId === COLUMN_ID_SHORT_LABEL_SAMPLE),
      linkReactionShortLabel: colId === 'reaction',
      linkReactionShortLabelAvailable: !columns.some(col => col.colId !== colId && col.colId === COLUMN_ID_SHORT_LABEL_REACTION),
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
    const keys = columns.map((column) => column.headerName);

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

    return (
      <Modal centered animation show={modal.show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Column name</Form.Label>
            <Form.Control
              type="text"
              value={columnNameValue}
              onChange={this.handleColumnNameChange.bind(this)}
            />
            <Form.Text className="text-danger">{columnNameError}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <ButtonToolbar className="gap-1">
            <Button variant="warning" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" onClick={this.handleSubmit.bind(this)}>
              {title}
            </Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    );
  }
}

ResearchPlanDetailsFieldTableColumnNameModal.propTypes = {
  modal: PropTypes.object,
  columnName: PropTypes.string,
  onSubmit: PropTypes.func,
  onHide: PropTypes.func,
  columns: PropTypes.array,
  colId: PropTypes.string,
};



export default ResearchPlanDetailsFieldTableColumnNameModal;
