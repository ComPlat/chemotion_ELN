/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Row, Col, ControlLabel, Tooltip, OverlayTrigger, DropdownButton, MenuItem } from 'react-bootstrap';
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
      field, index, disabled, onChange, onDrop, onDelete, onExport, update, edit, tableIndex,
      onCopyToMetadata, isNew, copyableFields
    } = this.props;
    let label;
    let component;
    const metadataTooltipText = 'Copy field content to Metadata';
    switch (field.type) {
      case 'richtext':
        label = field?.title;
        component =
          (<ResearchPlanDetailsFieldRichText
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />);
        break;
      case 'ketcher':
        label = 'Ketcher schema';
        component =
          (<ResearchPlanDetailsFieldKetcher
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />);
        break;
      case 'image':
        label = 'Image';
        component =
          (<ResearchPlanDetailsFieldImage
            attachments={this.props.attachments}
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            researchPlan={this.props.researchPlan}
            edit={edit}/>);
        break;
      case 'table':
        field.value.columns.forEach((item) => {
          item.cellEditor = 'agTextCellEditor';
          return item;
        });
        label = 'Table';
        component =
          (<ResearchPlanDetailsFieldTable
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            onExport={onExport}
            update={update}
            edit={edit}
            tableIndex={tableIndex}
          />);
        break;
      case 'sample':
        label = 'Sample';
        component =
          (<ResearchPlanDetailsFieldSample
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />);
        break;
      case 'reaction':
        label = 'Reaction';
        component =
          (<ResearchPlanDetailsFieldReaction
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />);
        break;
      default:
        label = '';
        component = <div />;
    }

    let dropTarget;
    let fieldHeader;
    let copyToMetadataButton = '';
    let className = 'research-plan-field';
    if (edit) {
      dropTarget = (
        <Col md={12}>
          <ResearchPlanDetailsDropTarget index={index} />
        </Col>
      );

      if (field.type === 'richtext') {
        copyToMetadataButton = (
          <OverlayTrigger
            placement="top"
            delayShow={500}
            overlay={<Tooltip id="metadataTooltip">{metadataTooltipText}</Tooltip>}
          >
            <ButtonGroup className="pull-right">
              <DropdownButton
                id="copyMetadataButton"
                title=""
                className="fa fa-laptop"
                bsStyle="info"
                bsSize="xsmall"
                pullRight
                disabled={isNew}
              >
                <li role="presentation" className="">Copy to Metadata field:</li>
                <li role="separator" className="divider" />
                {
                  copyableFields.map(element => (
                    <MenuItem
                      key={element.fieldName}
                      onClick={() => onCopyToMetadata(field.id, element.fieldName)}
                    >
                      {element.title}
                    </MenuItem>
                  ))
                }
              </DropdownButton>
            </ButtonGroup>
          </OverlayTrigger>
        );
      }

      fieldHeader = (
        <div className="research-plan-field-header">
          {/* TODO: make label editable */}
          <ControlLabel>{label}</ControlLabel>
          <Button className="pull-right" bsStyle="danger" bsSize="xsmall" onClick={() => onDelete(field.id,this.props.attachments )} data-cy="researchplan-item-delete">
            <i className="fa fa-times" />
          </Button>
          {copyToMetadataButton}
          <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)} />
        </div>
      );
    } else {
      className += ' static';
    }

    return (
      <Row>
        {dropTarget}
        <Col md={12}>
          <div className={className}>
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
  update: PropTypes.bool,
  edit: PropTypes.bool,
  attachments: PropTypes.array
};
