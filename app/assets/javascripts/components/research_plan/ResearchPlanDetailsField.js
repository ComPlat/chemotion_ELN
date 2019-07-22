import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Col } from 'react-bootstrap';

import ResearchPlanDetailsDragSource from './ResearchPlanDetailsDragSource'
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget';
import RichTextField from './ResearchPlanDetailsRichTextField';
import KetcherField from './ResearchPlanDetailsKetcherField';

export default class ResearchPlanDetailsField extends Component {

  render() {
    let { field, index, disabled, onChange, onDrop } = this.props

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
      <Col md={12}>
      <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)}/>
      <ResearchPlanDetailsDropTarget index={index}/>
      <FormGroup>
        {field_component}
      </FormGroup>
      </Col>
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
