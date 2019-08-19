import React, { Component } from 'react'
import PropTypes from 'prop-types'

import QuillEditor from '../QuillEditor'
import QuillViewer from '../QuillViewer'

export default class ResearchPlanDetailsFieldRichText extends Component {

  renderEdit() {
    const { field, index, disabled, onChange } = this.props

    return (
      <QuillEditor value={field.value}
        onChange={(value) => onChange(value, field.id)}
        disabled={disabled}
      />
    )
  }

  renderStatic() {
    const { field } = this.props

    return <QuillViewer value={field.value} />
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit()
    } else {
      return this.renderStatic()
    }
  }
}

ResearchPlanDetailsFieldRichText.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
