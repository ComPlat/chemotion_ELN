import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row } from 'react-bootstrap';

import Field from './ResearchPlanDetailsField';

export default class ResearchPlanDetailsBody extends Component {

  constructor(props) {
    super(props)
    const { body, disabled, onChange, onDrop } = props
    this.state = {
      body,
      disabled,
      onChange,
      onDrop
    }
  }

  render() {
    let { body, disabled, onChange, onDrop } = this.state

    let fields = body.map((field, index) => {
        return <Field key={field.id}
                      field={field} index={index} disabled={disabled}
                      onChange={onChange.bind(this)}
                      onDrop={onDrop.bind(this)} />
    })

    return (
      <Row className="research-plan-details-body">
        {fields}
      </Row>
    )
  }
}

ResearchPlanDetailsBody.propTypes = {
  body: PropTypes.array,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
}
