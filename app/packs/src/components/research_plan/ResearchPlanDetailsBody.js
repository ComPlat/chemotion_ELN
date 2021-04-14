import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, Row, Col } from 'react-bootstrap';
import ResearchPlanDetailsAddField from './ResearchPlanDetailsAddField';
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget';
import Field from './ResearchPlanDetailsField';

// eslint-disable-next-line react/prefer-stateless-function
export default class ResearchPlanDetailsBody extends Component {
  render() {
    const {
      body, disabled, onChange, onDrop, onAdd, onDelete, onExport, update, edit
    } = this.props;

    let tableIndex = 0;
    const fields = body.map((field, index) =>{
      let item = (<Field
        key={field.id}
        field={field}
        index={index}
        disabled={disabled}
        onChange={onChange.bind(this)}
        onDrop={onDrop.bind(this)}
        onDelete={onDelete.bind(this)}
        onExport={onExport.bind(this)}
        update={update}
        edit={edit}
        tableIndex={tableIndex}
      />)

      if(field.type === 'table') tableIndex++;

      return item;
    });

    let className = 'research-plan-body';
    let bodyFooter;
    if (edit) {
      bodyFooter = (
        <Row>
          <Col md={12}>
            <ResearchPlanDetailsDropTarget index={fields.length} />
            <div>
              <ControlLabel>Add field</ControlLabel>
              <div>
                <ResearchPlanDetailsAddField onAdd={onAdd} />
              </div>
            </div>
          </Col>
        </Row>
      );
    } else {
      className += ' static';
    }

    return (
      <div className={className}>
        {fields}
        {bodyFooter}
      </div>
    );
  }
}

ResearchPlanDetailsBody.propTypes = {
  body: PropTypes.array,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
  onDelete: PropTypes.func,
  onExport: PropTypes.func,
  update: PropTypes.bool,
  edit: PropTypes.bool
};
