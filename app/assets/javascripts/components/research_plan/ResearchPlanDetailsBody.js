import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ControlLabel, Row, Col } from 'react-bootstrap'

import ResearchPlanDetailsAddField from './ResearchPlanDetailsAddField'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget'
import Field from './ResearchPlanDetailsField'

export default class ResearchPlanDetailsBody extends Component {

  render() {
    let { body, disabled, onChange, onDrop, onAdd, onDelete } = this.props

    let fields = body.map((field, index) => {
        return <Field key={field.id}
                      field={field} index={index} disabled={disabled}
                      onChange={onChange.bind(this)}
                      onDrop={onDrop.bind(this)}
                      onDelete={onDelete.bind(this)} />
    })

    return (
      <div className="research-plan-details-body">
        <ControlLabel>Body</ControlLabel>
        {fields}
        <Row>
          <Col md={12}>
            <div className="research-plan-details-body-footer">
              <ResearchPlanDetailsAddField onAdd={onAdd}/>
              <ResearchPlanDetailsDropTarget index={fields.length}/>
            </div>
          </Col>
        </Row>
      </div>
    )
  }
}

ResearchPlanDetailsBody.propTypes = {
  body: PropTypes.array,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
}
