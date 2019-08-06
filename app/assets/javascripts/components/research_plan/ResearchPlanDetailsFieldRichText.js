import React, { Component } from 'react'
import PropTypes from 'prop-types'

import QuillEditor from '../QuillEditor'

export default class ResearchPlanDetailsFieldRichText extends Component {

  render() {
    let { field, index, disabled, onChange } = this.props

    return (
      <QuillEditor value={field.value}
        onChange={(value) => onChange(value, field.id)}
        disabled={disabled}
      />
    )
  }

}

ResearchPlanDetailsFieldRichText.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
