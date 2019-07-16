import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Row, Col } from 'react-bootstrap';

import QuillEditor from '../QuillEditor';

export default class RichTextField extends Component {

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
      <Row>
        <Col md={12}>
          <FormGroup>
            <QuillEditor value={field.value}
              onChange={this.handleChange.bind(this)}
              disabled={disabled}
            />
          </FormGroup>
        </Col>
      </Row>
    )
  }
}

RichTextField.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}
