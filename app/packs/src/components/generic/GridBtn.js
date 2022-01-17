/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import GridDnD from './GridDnD';

const AddRowBtn = ({ addRow }) => (
  <OverlayTrigger delayShow={1000} placement="top" overlay={<Tooltip id={uuid.v4()} >add entry</Tooltip>}>
    <Button onClick={() => addRow()} bsSize="xsmall" bsStyle="primary"><i className="fa fa-plus" aria-hidden="true" /></Button>
  </OverlayTrigger>
);

AddRowBtn.propTypes = { addRow: PropTypes.func.isRequired };

const DelRowBtn = ({ delRow, node }) => {
  const { data } = node;
  return (
    <OverlayTrigger delayShow={1000} placement="top" overlay={<Tooltip id={uuid.v4()} >remove</Tooltip>}>
      <Button onClick={() => delRow(data)} bsSize="xsmall"><i className="fa fa-times" aria-hidden="true" /></Button>
    </OverlayTrigger>);
};

DelRowBtn.propTypes = { delRow: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

const NullRowBtn = () => (<div className="grid-btn-none"><span className="fa fa-arrows" /></div>);

const DnDRowBtn = ({
  moveRow, field, type, node
}) => (
  <GridDnD field={field} type={type} rowValue={node.data} handleMove={moveRow} />
);

DnDRowBtn.propTypes = {
  moveRow: PropTypes.func.isRequired,
  field: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  node: PropTypes.object.isRequired
};
export { AddRowBtn, DelRowBtn, DnDRowBtn, NullRowBtn };
