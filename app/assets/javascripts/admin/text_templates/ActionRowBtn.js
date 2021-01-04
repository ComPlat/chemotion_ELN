import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-bootstrap';

const RemoveRowBtn = ({ removeRow, node }) => {
  const { data, gridOptionsWrapper } = node;

  const btnClick = () => {
    gridOptionsWrapper.gridOptions.suppressRowClickSelection = true;
    removeRow(data.name);
    setTimeout(() => {
      gridOptionsWrapper.gridOptions.suppressRowClickSelection = false;
    });
  };

  return (
    <Button
      active
      onClick={btnClick}
      bsSize="xsmall"
      bsStyle="danger"
    >
      <i className="fa fa-trash" />
    </Button>
  );
};

RemoveRowBtn.propTypes = {
  removeRow: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

const SaveRowBtn = ({ saveRow, node }) => {
  const { data, gridOptionsWrapper } = node;

  const btnClick = () => {
    gridOptionsWrapper.gridOptions.suppressRowClickSelection = true;
    saveRow(data.name);
    setTimeout(() => {
      gridOptionsWrapper.gridOptions.suppressRowClickSelection = false;
    });
  };

  return (
    <Button
      active
      onClick={btnClick}
      bsSize="xsmall"
      bsStyle="success"
    >
      <i className="fa fa-floppy-o" />
    </Button>
  );
};

SaveRowBtn.propTypes = {
  saveRow: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

const ActionRowBtn = ({ removeRow, saveRow, node }) => {
  const { data } = node;
  if (data.name || data.name !== '') {
    return <RemoveRowBtn node={node} removeRow={removeRow} />;
  }

  return <SaveRowBtn node={node} saveRow={saveRow} />;
};

ActionRowBtn.propTypes = {
  removeRow: PropTypes.func.isRequired,
  saveRow: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

export default ActionRowBtn;
