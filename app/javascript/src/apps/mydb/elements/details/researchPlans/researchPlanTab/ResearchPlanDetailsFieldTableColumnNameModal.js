import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button, Form } from 'react-bootstrap';
class ResearchPlanDetailsFieldTableColumnNameModal extends Component {
  constructor(props) {
    super(props);
    const { modal, columns } = this.props;

    // For insert actions, don't consider any existing column
    // For rename actions, find the column being renamed
    const currentColumn = (modal.action === 'rename' && modal.colId) 
      ? columns.find(col => col.colId === modal.colId) 
      : null;
    
    const isCurrentlySampleColumn = currentColumn?.linkType === 'sample';
    const isCurrentlyReactionColumn = currentColumn?.linkType === 'reaction';

    // Check availability of link types
    const sampleColumnExists = columns.some(col => col.linkType === 'sample');
    const reactionColumnExists = columns.some(col => col.linkType === 'reaction');

    this.state = {
      columnNameValue: '',
      columnNameError: '',
      linkSampleShortLabel: isCurrentlySampleColumn,
      linkReactionShortLabel: isCurrentlyReactionColumn,
      linkSampleShortLabelAvailable: !sampleColumnExists || isCurrentlySampleColumn,
      linkReactionShortLabelAvailable: !reactionColumnExists || isCurrentlyReactionColumn,
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      const { modal, columns } = this.props;

      let columnNameValue = '';
      let linkSampleShortLabel = false;
      let linkReactionShortLabel = false;

      if (modal.action === 'rename') {
        const currentColumn = columns.find((o) => o.colId === modal.colId);
        if (currentColumn) {
          columnNameValue = currentColumn.headerName;
          // Check if this column currently has linking functionality
          linkSampleShortLabel = currentColumn.linkType === 'sample';
          linkReactionShortLabel = currentColumn.linkType === 'reaction';
        }
      }
      // For 'insert' action, keep checkboxes unchecked - this is correct behavior

      // Simple availability check: only one of each link type allowed
      const sampleColumnExists = columns.some((col) => col.linkType === 'sample');
      const reactionColumnExists = columns.some((col) => col.linkType === 'reaction');

      // Allow linking if no column with that link type exists, or if we're renaming the existing one
      const isCurrentlySampleColumn = modal.colId && columns.find(col => col.colId === modal.colId)?.linkType === 'sample';
      const isCurrentlyReactionColumn = modal.colId && columns.find(col => col.colId === modal.colId)?.linkType === 'reaction';

      this.setState({
        columnNameValue,
        columnNameError: '',
        linkSampleShortLabel,
        linkReactionShortLabel,
        linkSampleShortLabelAvailable: !sampleColumnExists || isCurrentlySampleColumn,
        linkReactionShortLabelAvailable: !reactionColumnExists || isCurrentlyReactionColumn,
      });
    }
  }

  handleColumnNameChange(event) {
    this.setState({ columnNameValue: event.target.value });
  }

  handleSampleLinkChange = (event) => {
    const checked = event.target.checked;
    this.setState({
      linkSampleShortLabel: checked,
      linkReactionShortLabel: checked ? false : this.state.linkReactionShortLabel
    });
  }

  handleReactionLinkChange = (event) => {
    const checked = event.target.checked;
    this.setState({
      linkReactionShortLabel: checked,
      linkSampleShortLabel: checked ? false : this.state.linkSampleShortLabel
    });
  }

  handleSubmit() {
    const { columns, onSubmit } = this.props;
    const { columnNameValue, linkSampleShortLabel, linkReactionShortLabel } = this.state;

    if (!columnNameValue) {
      this.setState({ columnNameError: 'Please give a column name.' });
      return;
    }

    // Determine link type based on checkboxes
    let linkType = null;
    if (linkSampleShortLabel) {
      linkType = 'sample';
    } else if (linkReactionShortLabel) {
      linkType = 'reaction';
    }

    // Check for duplicate regular column names only
    if (!linkType) {
      const existingRegularColumns = columns.filter(col => !col.linkType);
      const isDuplicate = existingRegularColumns.some(col => col.headerName === columnNameValue);

      if (isDuplicate) {
        this.setState({ columnNameError: 'A column with this title already exists.' });
        return;
      }
    }

    this.setState({ columnNameError: '', columnNameValue: '' });
    // Pass the column name, display name, and link type
    onSubmit(columnNameValue, columnNameValue, linkType);
  }

  render() {
    const { modal, onHide } = this.props;
    const {
      columnNameValue,
      columnNameError,
      linkSampleShortLabel,
      linkReactionShortLabel,
      linkSampleShortLabelAvailable,
      linkReactionShortLabelAvailable
    } = this.state;

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
          <Form.Group className="mb-3">
            <Form.Label>Column name</Form.Label>
            <Form.Control
              type="text"
              value={columnNameValue}
              onChange={this.handleColumnNameChange.bind(this)}
              placeholder="Enter column name"
            />
            <Form.Text className="text-danger">{columnNameError}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Special Column Linking</Form.Label>
            <div className="mt-2">
              <Form.Check
                type="checkbox"
                id="link-sample"
                label="Enable Sample Short Label Linking"
                checked={linkSampleShortLabel}
                disabled={!linkSampleShortLabelAvailable}
                onChange={this.handleSampleLinkChange}
                className="mb-2"
              />
              <Form.Check
                type="checkbox"
                id="link-reaction"
                label="Enable Reaction Short Label Linking"
                checked={linkReactionShortLabel}
                disabled={!linkReactionShortLabelAvailable}
                onChange={this.handleReactionLinkChange}
              />
            </div>
            <Form.Text className="text-muted">
              {!linkSampleShortLabelAvailable && !linkReactionShortLabelAvailable ? (
                'Both sample and reaction linking columns already exist.'
              ) : !linkSampleShortLabelAvailable ? (
                'Sample linking column already exists.'
              ) : !linkReactionShortLabelAvailable ? (
                'Reaction linking column already exists.'
              ) : (
                'Check one option to enable automatic linking for short labels. The column name you enter will be used as the display name.'
              )}
            </Form.Text>
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
