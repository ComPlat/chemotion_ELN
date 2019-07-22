import React, { Component } from 'react';
import PropTypes from 'prop-types';

import QuillEditor from '../QuillEditor';

export default class ResearchPlanDetailsRichTextField extends Component {

  constructor(props) {
    super(props)
    const { field, index, disabled, onChange } = props
    this.state = {
      field,
      index,
      disabled,
      onChange
    }
  }

  handleChange(event) {
    let { field, index, onChange } = this.state

    field.value = event

    this.setState({
      field: field
    });

    onChange(field.value, index)
  }

  render() {
    let { field, disabled } = this.state

    return (
      <QuillEditor value={field.value}
        onChange={this.handleChange.bind(this)}
        disabled={disabled}
      />
    )
  }
}

ResearchPlanDetailsRichTextField.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
