import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ControlLabel, FormControl, FormGroup, Row, Col } from 'react-bootstrap'

export default class ResearchPlanDetailsName extends Component {

  render() {
    const { value, disabled, onChange, edit } = this.props

    if (edit) {
      return (
        <FormGroup>
          <ControlLabel>Name</ControlLabel>
          <FormControl
            type="text"
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </FormGroup>
      )
    } else {
      return <h4>{value}</h4>
    }
  }

}

ResearchPlanDetailsName.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
