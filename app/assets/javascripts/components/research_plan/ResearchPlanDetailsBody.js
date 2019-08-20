import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ControlLabel, Row, Col } from 'react-bootstrap'

import ResearchPlanDetailsAddField from './ResearchPlanDetailsAddField'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget'
import Field from './ResearchPlanDetailsField'

export default class ResearchPlanDetailsBody extends Component {

  render() {
    let { body, disabled, onChange, onDrop, onAdd, onDelete, update, edit } = this.props

    let fields = body.map((field, index) => {
        return <Field key={field.id}
                      field={field} index={index} disabled={disabled}
                      onChange={onChange.bind(this)}
                      onDrop={onDrop.bind(this)}
                      onDelete={onDelete.bind(this)}
                      update={update}
                      edit={edit} />
    })

    let className = 'research-plan-details-static'
    let bodyFooter
    if (edit) {
      className = 'research-plan-details-body'
      bodyFooter = (
        <Row>
          <Col md={12}>
            <ResearchPlanDetailsDropTarget index={fields.length}/>
            <div>
              <ControlLabel>Add field</ControlLabel>
              <div>
                <ResearchPlanDetailsAddField onAdd={onAdd}/>
              </div>
            </div>
          </Col>
        </Row>
      )
    }

    return (
      <div className={className}>
        {fields}
        {bodyFooter}
      </div>
    )
  }
}

ResearchPlanDetailsBody.propTypes = {
  body: PropTypes.array,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
  update: PropTypes.bool
}
