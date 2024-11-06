import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, Row, Col } from 'react-bootstrap';
import ResearchPlanDetailsAddField from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsAddField';
import ResearchPlanDetailsDropTarget from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsDropTarget';
import Field from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsField';

// eslint-disable-next-line react/prefer-stateless-function
export default class ResearchPlanDetailsBody extends Component {
  render() {
    const {
      body, disabled, onChange, onDrop, onAdd, onDelete, onExport, update, edit, isNew,
      copyableFields, onCopyToMetadata
    } = this.props;

    let tableIndex = 0;
    const fields = body.map((field, index) => {
      let item;
      if (field.type === 'image') {
        item = (
          <Field
            attachments={this.props.attachments}
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            onDrop={onDrop.bind(this)}
            onDelete={onDelete.bind(this)}
            onExport={onExport.bind(this)}
            onCopyToMetadata={onCopyToMetadata.bind(this)}
            update={update}
            edit={edit}
            tableIndex={tableIndex}
            isNew={isNew}
            copyableFields={copyableFields}
            researchPlan={this.props.researchPlan}
          />
        );
      } else {
        item = (
          <Field
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            onDrop={onDrop.bind(this)}
            onDelete={onDelete.bind(this)}
            onExport={onExport.bind(this)}
            onCopyToMetadata={onCopyToMetadata.bind(this)}
            update={update}
            edit={edit}
            tableIndex={tableIndex}
            isNew={isNew}
            copyableFields={copyableFields}
          />
        );
      }
      if (field.type === 'table') tableIndex++;

      return item;
    });

    return (
      <div>
        {fields}
        {edit
          && (
            <Row>
              <Col sm={12}>
                <ResearchPlanDetailsDropTarget index={fields.length} />
                <div>
                  <Form.Label>Add field</Form.Label>
                  <div className="mb-2">
                    <ResearchPlanDetailsAddField onAdd={onAdd} />
                  </div>
                </div>
              </Col>
            </Row>
          )}
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
  onCopyToMetadata: PropTypes.func,
  update: PropTypes.bool,
  edit: PropTypes.bool,
  isNew: PropTypes.bool,
  copyableFields: PropTypes.arrayOf(PropTypes.object),
  attachments: PropTypes.array
};
