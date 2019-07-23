import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ControlLabel, FormControl, FormGroup, Row, Col } from 'react-bootstrap'

export default class ResearchPlanDetailsNameField extends Component {

  render() {
    let { value, disabled, onChange } = this.props

    return (
      <Row>
        <Col md={4}>
          <FormGroup>
            <ControlLabel>Name</ControlLabel>
            <FormControl
              type="text"
              value={value || ''}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
            />
          </FormGroup>
        </Col>
      </Row>
    )
  }

}

ResearchPlanDetailsNameField.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
