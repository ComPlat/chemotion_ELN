import React, { Component } from 'react';
import PropTypes from 'prop-types';
import QuillEditor from 'src/components/QuillEditor';
import QuillViewer from 'src/components/QuillViewer';

export default class ResearchPlanDetailsFieldRichText extends Component {
  constructor(props) {
    super(props);
    this.getAttachments = this.getAttachments.bind(this);
    this.handleAttachmentsChange = this.handleAttachmentsChange.bind(this);
  }

  // Always resolve from props so a save/reload cycle sees the up-to-date list.
  getAttachments() {
    return this.props.attachments || [];
  }

  // The RP body-block persistence pipeline (see ResearchPlanDetails.handleBodyChange)
  // treats the 3rd arg as the fresh attachments list — the same contract used
  // by ResearchPlanDetailsFieldImage.handleDrop.
  handleAttachmentsChange(nextAttachments) {
    const { field, onChange } = this.props;
    onChange(field.value, field.id, nextAttachments);
  }

  renderEdit() {
    const {
      field, disabled, onChange
    } = this.props;

    return (
      <div>
        <QuillEditor
          value={field.value}
          height="100%"
          onChange={value => onChange(value, field.id)}
          disabled={disabled}
          getAttachments={this.getAttachments}
          onAttachmentsChange={this.handleAttachmentsChange}
        />
      </div>
    );
  }

  renderStatic() {
    const { field } = this.props;
    return <QuillViewer value={field.value} />;
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldRichText.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  attachments: PropTypes.array,
};

ResearchPlanDetailsFieldRichText.defaultProps = {
  attachments: [],
};
