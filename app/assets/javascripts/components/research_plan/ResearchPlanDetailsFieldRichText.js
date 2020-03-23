import React, { Component } from 'react';
import PropTypes from 'prop-types';
import QuillEditor from '../QuillEditor';
import QuillViewer from '../QuillViewer';

export default class ResearchPlanDetailsFieldRichText extends Component {

  renderEdit() {
    const {
      field, disabled, onChange
    } = this.props;

    return (
      <div className="quill-resize">
        <QuillEditor
          value={field.value}
          height="100%"
          onChange={value => onChange(value, field.id)}
          disabled={disabled}
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
}
