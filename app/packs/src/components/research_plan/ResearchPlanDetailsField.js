/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col, ControlLabel } from 'react-bootstrap';
import ResearchPlanDetailsDragSource from './ResearchPlanDetailsDragSource';
import ResearchPlanDetailsDropTarget from './ResearchPlanDetailsDropTarget';
import ResearchPlanDetailsFieldRichText from './ResearchPlanDetailsFieldRichText';
import ResearchPlanDetailsFieldKetcher from './ResearchPlanDetailsFieldKetcher';
import ResearchPlanDetailsFieldImage from './ResearchPlanDetailsFieldImage';
import ResearchPlanDetailsFieldTable from './ResearchPlanDetailsFieldTable';
import ResearchPlanDetailsFieldSample from './ResearchPlanDetailsFieldSample';
import ResearchPlanDetailsFieldReaction from './ResearchPlanDetailsFieldReaction';
import CustomTextEditor from '../common/CustomTextEditor';

export default class ResearchPlanDetailsField extends Component {
  render() {
    const {
      field, index, disabled, onChange, onDrop, onDelete, onExport, update, edit, tableIndex
    } = this.props;
    let label;
    let component;
    switch (field.type) {
      case 'richtext':
        label = 'Text';
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
            key={field.id}
            field={field}
            index={index}
            disabled={disabled}
            onChange={onChange.bind(this)}
            edit={edit}
          />);
        break;
      case 'table':
        field.value.columns.forEach((item)=> {
          item.editor = CustomTextEditor
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
    let className = 'research-plan-field';
    if (edit) {
      dropTarget = (
        <Col md={12}>
          <ResearchPlanDetailsDropTarget index={index} />
        </Col>
      );
      fieldHeader = (
        <div className="research-plan-field-header">
          <Button className="pull-right" bsStyle="danger" bsSize="xsmall" onClick={() => onDelete(field.id)}>
            <i className="fa fa-times" />
          </Button>
          <ResearchPlanDetailsDragSource index={index} onDrop={onDrop.bind(this)} />
          <ControlLabel>{label}</ControlLabel>
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
    )
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
  update: PropTypes.bool,
  edit: PropTypes.bool
};
