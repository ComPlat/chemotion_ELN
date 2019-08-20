import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Button, Row, Col, ControlLabel } from 'react-bootstrap'

import ResearchPlanDetailsDragSource from './ResearchPlanDetailsDragSource'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget'

import ResearchPlanDetailsFieldRichText from './ResearchPlanDetailsFieldRichText'
import ResearchPlanDetailsFieldKetcher from './ResearchPlanDetailsFieldKetcher'
import ResearchPlanDetailsFieldImage from './ResearchPlanDetailsFieldImage'
import ResearchPlanDetailsFieldTable from './ResearchPlanDetailsFieldTable'
import ResearchPlanDetailsFieldSample from './ResearchPlanDetailsFieldSample'

export default class ResearchPlanDetailsField extends Component {

  render() {
    let { field, index, disabled, onChange, onDrop, onDelete, update, edit } = this.props

    let label, component
    switch (field.type) {
      case 'richtext':
        label = 'Text'
        component = <ResearchPlanDetailsFieldRichText key={field.id}
                              field={field} index={index} disabled={disabled}
                              onChange={onChange.bind(this)} edit={edit} />
        break;
      case 'ketcher':
        label = 'Ketcher schema'
        component = <ResearchPlanDetailsFieldKetcher key={field.id}
                              field={field} index={index} disabled={disabled}
                              onChange={onChange.bind(this)} edit={edit} />
        break;
      case 'image':
        label = 'Image'
        component = <ResearchPlanDetailsFieldImage key={field.id}
                              field={field} index={index} disabled={disabled}
                              onChange={onChange.bind(this)} edit={edit} />
        break;
      case 'table':
        label = 'Table'
        component = <ResearchPlanDetailsFieldTable key={field.id}
                              field={field} index={index} disabled={disabled}
                              onChange={onChange.bind(this)} update={update} edit={edit} />
        break;
      case 'sample':
        label = 'Sample'
        component = <ResearchPlanDetailsFieldSample key={field.id}
                              field={field} index={index} disabled={disabled}
                              onChange={onChange.bind(this)} edit={edit} />
        break;
    }

    let dropTarget, fieldHeader
    if (edit) {
      dropTarget = (
        <Col md={12}>
          <ResearchPlanDetailsDropTarget index={index}/>
        </Col>
      )
      fieldHeader = (
        <div className="field-header">
          <Button className="pull-right" bsStyle="danger" bsSize="xsmall"
            onClick={() => onDelete(field.id)} >
              <i className="fa fa-times"></i>
          </Button>
          <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)}/>
          <ControlLabel>{label}</ControlLabel>
        </div>
      )
    }

    return (
      <Row>
        {dropTarget}
        <Col md={12}>
          <div className="field">
            {fieldHeader}
            {component}
          </div>
        </Col>
      </Row>
    )
  }
}

ResearchPlanDetailsField.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
  update: PropTypes.bool
}
