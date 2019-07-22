import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl, FormGroup, Row, Col } from 'react-bootstrap';

export default class NameField extends Component {

  constructor(props) {
    super(props)
    const { value, disabled, onChange } = props
    this.state = {
      value,
      disabled,
      onChange
    }
  }

  handleChange(event) {
    let { value, onChange } = this.state

    value = event.target.value

    this.setState({
      value: value
    });

    onChange(value)
  }

  render() {
    let { value, disabled } = this.state

    return (
      <Row>
        <Col md={4}>
          <FormGroup>
            <ControlLabel>Name</ControlLabel>
            <FormControl
              type="text"
              value={value || ''}
              onChange={this.handleChange.bind(this)}
              disabled={disabled}
            />
          </FormGroup>
        </Col>
      </Row>
    )
  }
}

NameField.propTypes = {
  value: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
