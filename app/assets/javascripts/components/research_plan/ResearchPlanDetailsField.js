import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Button, Row, Col } from 'react-bootstrap'

import ResearchPlanDetailsDragSource from './ResearchPlanDetailsDragSource'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget'
import RichTextField from './ResearchPlanDetailsRichTextField'
import KetcherField from './ResearchPlanDetailsKetcherField'

export default class ResearchPlanDetailsField extends Component {

  render() {
    let { field, index, disabled, onChange, onDrop, onDelete } = this.props

    let field_component
    switch (field.type) {
      case 'richtext':
        field_component = <RichTextField key={field.id}
                                         field={field} index={index} disabled={disabled}
                                         onChange={onChange.bind(this)} />
        break;
      case 'ketcher':
        field_component = <KetcherField key={field.id}
                                        field={field} index={index} disabled={disabled}
                                        onChange={onChange.bind(this)} />
        break;
    }

    return (
      <Row>
        <Col md={12}>
          <div className="research-plan-details-body-seperator">
            <Button bsStyle="danger" bsSize="xsmall" onClick={() => onDelete(field.id)} >
              <i className="fa fa-times"></i>
            </Button>
            <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)}/>
            <ResearchPlanDetailsDropTarget index={index}/>
          </div>
        </Col>
        <Col md={12}>
          <div className="research-plan-details-body-field">
            <FormGroup>
              {field_component}
            </FormGroup>
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
}
