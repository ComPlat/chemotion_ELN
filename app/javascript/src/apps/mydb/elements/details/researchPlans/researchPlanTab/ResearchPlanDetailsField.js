/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable max-len */
/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, ButtonGroup, Row, Col, Tooltip, OverlayTrigger, Dropdown
} from 'react-bootstrap';
import ResearchPlanDetailsDragSource from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsDragSource';
import ResearchPlanDetailsDropTarget from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsDropTarget';
import ResearchPlanDetailsFieldRichText from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldRichText';
import ResearchPlanDetailsFieldKetcher from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldKetcher';
import ResearchPlanDetailsFieldImage from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldImage';
import ResearchPlanDetailsFieldTable from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTable';
import ResearchPlanDetailsFieldSample from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldSample';
import ResearchPlanDetailsFieldReaction from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldReaction';

export default class ResearchPlanDetailsField extends Component {
  render() {
    const {
      field, index, disabled, onChange, onDrop, onDelete, onExport, edit, tableIndex,
      onCopyToMetadata, isNew, copyableFields
    } = this.props;
    let label;
    let component;
    const metadataTooltipText = 'Copy field content to Metadata';
    switch (field.type) {
      case 'richtext':
        label = field?.title;
        component = (
          <ResearchPlanDetailsFieldRichText
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />
        );
        break;
      case 'ketcher':
        label = 'Ketcher schema';
        component = (
          <ResearchPlanDetailsFieldKetcher
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />
        );
        break;
      case 'image':
        label = 'Image';
        component = (
          <ResearchPlanDetailsFieldImage
            attachments={this.props.attachments}
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            researchPlan={this.props.researchPlan}
            edit={edit}
          />
        );
        break;
      case 'table':
        field.value.columns.forEach((item) => {
          item.cellEditor = 'agTextCellEditor';
          return item;
        });
        label = 'Table';
        component = (
          <ResearchPlanDetailsFieldTable
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            onExport={onExport}
            edit={edit}
            tableIndex={tableIndex}
          />
        );
        break;
      case 'sample':
        label = 'Sample';
        component = (
          <ResearchPlanDetailsFieldSample
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />
        );
        break;
      case 'reaction':
        label = 'Reaction';
        component = (
          <ResearchPlanDetailsFieldReaction
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />
        );
        break;
      default:
        label = '';
        component = null;
    }

    let fieldHeader;
    let copyToMetadataButton = '';
    let dropTarget;

    if (edit) {
      dropTarget = (
        <Col md={12}>
          <ResearchPlanDetailsDropTarget index={index} />
        </Col>
      );

      if (field.type === 'richtext') {
        copyToMetadataButton = (
          <ButtonGroup>
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle
                id="copyMetadataButton"
                title={metadataTooltipText}
                variant="info"
                size="xsm"
                disabled={isNew}
              >
                <i className="fa fa-laptop" aria-hidden="true" />
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Header>Copy to Metadata field:</Dropdown.Header>
                <Dropdown.Divider />
                {copyableFields.map((element) => (
                  <Dropdown.Item
                    key={element.fieldName}
                    onClick={() => onCopyToMetadata(field.id, element.fieldName)}
                  >
                    {element.title}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </ButtonGroup>
        );
      }

      fieldHeader = (
        <div className="mt-2 d-flex align-items-center">
          {/* TODO: make label editable */}
          <Form.Label className="me-auto">{label}</Form.Label>
          <div className="ms-auto">
            <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)} />
            {copyToMetadataButton}
            <Button
              variant="danger"
              size="xsm"
              onClick={() => onDelete(field.id, this.props.attachments)}
              data-cy="researchplan-item-delete"
            >
              <i className="fa fa-times" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Row className="my-3">
        {dropTarget}
        <Col sm={12}>
          <div className={`${!edit ? 'mb-5' : ''}`}>
            {fieldHeader}
            {component}
          </div>
        </Col>
      </Row>
    );
  }
}

ResearchPlanDetailsField.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
  onDelete: PropTypes.func,
  onExport: PropTypes.func,
  onCopyToMetadata: PropTypes.func,
  isNew: PropTypes.bool,
  copyableFields: PropTypes.arrayOf(PropTypes.object),
  edit: PropTypes.bool,
  attachments: PropTypes.array
};
