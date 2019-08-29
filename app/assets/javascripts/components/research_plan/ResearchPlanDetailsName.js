import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ControlLabel, FormControl, FormGroup, Row, Col } from 'react-bootstrap'

export default class ResearchPlanDetailsName extends Component {

  render() {
    const { value, disabled, onChange, edit } = this.props

    if (edit) {
      return (
        <div className="research-plan-name">
          <Row>
            <Col lg={8}>
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
        </div>
      )
    } else {
      return (
        <div className="research-plan-name static">
          <h1>{value}</h1>
        </div>
      )
    }
  }

}

ResearchPlanDetailsName.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
