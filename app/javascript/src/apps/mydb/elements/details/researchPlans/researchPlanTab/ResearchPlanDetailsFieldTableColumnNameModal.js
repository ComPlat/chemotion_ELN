import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, ButtonToolbar, Button, Form
} from 'react-bootstrap';
import { COLUMN_ID_SHORT_LABEL_REACTION, COLUMN_ID_SHORT_LABEL_SAMPLE } from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableUtils';

class ResearchPlanDetailsFieldTableColumnNameModal extends Component {
  constructor(props) {
    super(props);
    const { modal, columns } = this.props;

    // For insert actions, don't consider any existing column
    // For rename actions, find the column being renamed
    const currentColumn = (modal.action === 'rename' && modal.colId)
      ? columns.find(col => col.colId === modal.colId)
      : null;

    const isCurrentlySampleColumn = currentColumn?.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE;
    const isCurrentlyReactionColumn = currentColumn?.linkType === COLUMN_ID_SHORT_LABEL_REACTION;

    // Check availability of link types
    const sampleColumnExists = columns.some(col => col.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE);
    const reactionColumnExists = columns.some(col => col.linkType === COLUMN_ID_SHORT_LABEL_REACTION);

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
          linkSampleShortLabel = currentColumn.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE;
          linkReactionShortLabel = currentColumn.linkType === COLUMN_ID_SHORT_LABEL_REACTION;
        }
      }
      // For 'insert' action, keep checkboxes unchecked - this is correct behavior

      // Simple availability check: only one of each link type allowed
      const sampleColumnExists = columns.some((col) => col.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE);
      const reactionColumnExists = columns.some((col) => col.linkType === COLUMN_ID_SHORT_LABEL_REACTION);

      // Allow linking if no column with that link type exists, or if we're renaming the existing one
      const isCurrentlySampleColumn = modal.colId && columns.find(col => col.colId === modal.colId)?.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE;
      const isCurrentlyReactionColumn = modal.colId && columns.find(col => col.colId === modal.colId)?.linkType === COLUMN_ID_SHORT_LABEL_REACTION;

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
    const { columns, onSubmit, onHide, modal } = this.props;
    const { columnNameValue, linkSampleShortLabel, linkReactionShortLabel } = this.state;

    if (!columnNameValue) {
      this.setState({ columnNameError: 'Please give a column name.' });
      return;
    }

    // Determine link type based on checkboxes
    let linkType = null;
    if (linkSampleShortLabel) {
      linkType = COLUMN_ID_SHORT_LABEL_SAMPLE;
    } else if (linkReactionShortLabel) {
      linkType = COLUMN_ID_SHORT_LABEL_REACTION;
    }

    // If renaming, check if the name or link type has changed
    if (modal.action === 'rename') {
      const currentColumn = columns.find(col => col.colId === modal.colId);
      if (currentColumn) {
        const nameUnchanged = currentColumn.headerName === columnNameValue;
        const currentLinkType = currentColumn.linkType || null;
        const linkTypeUnchanged = currentLinkType === linkType;

        if (nameUnchanged && linkTypeUnchanged) {
          onHide();
          return;
        }
      }
    }

    // Check for duplicate column names across all columns
    const isDuplicate = columns.some((col) => {
      if (modal.action === 'rename' && col.colId === modal.colId) {
        return false;
      }
      return col.headerName.toLowerCase() === columnNameValue.toLowerCase();
    });

    if (isDuplicate) {
      this.setState({ columnNameError: 'A column with this title already exists.' });
      return;
    }

    this.setState({ columnNameError: '', columnNameValue: '' });
    // Pass the column name, display name, and link type
    onSubmit(columnNameValue, columnNameValue, linkType);
  }

  render() {
    const { modal, onHide, columns } = this.props;
    const {
      columnNameValue,
      columnNameError,
      linkSampleShortLabel,
      linkReactionShortLabel,
      linkSampleShortLabelAvailable,
      linkReactionShortLabelAvailable
    } = this.state;

    // Find existing linked column names
    const existingSampleColumn = columns.find((col) => col.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE);
    const existingReactionColumn = columns.find((col) => col.linkType === COLUMN_ID_SHORT_LABEL_REACTION);

    // Generate help text based on availability
    const generateHelpText = () => {
      if (!linkSampleShortLabelAvailable && !linkReactionShortLabelAvailable) {
        return 'Both sample and reaction linking columns already exist: '
               + `"${existingSampleColumn?.headerName}" (sample) and `
               + `"${existingReactionColumn?.headerName}" (reaction).`;
      }
      if (!linkSampleShortLabelAvailable) {
        return `Sample linking column already exists: "${existingSampleColumn?.headerName}".`;
      }
      if (!linkReactionShortLabelAvailable) {
        return `Reaction linking column already exists: "${existingReactionColumn?.headerName}".`;
      }
      return 'Check one option to enable automatic linking for short labels. '
        + 'The column name you enter will be used as the display name.';
    };

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
              {generateHelpText()}
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
