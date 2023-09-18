import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-bootstrap';

function ActionHeaderBtn({ addRow }) {
  return (
    <Button
      active
      onClick={() => addRow()}
      bsSize="xsmall"
      bsStyle="primary"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

ActionHeaderBtn.propTypes = {
  addRow: PropTypes.func.isRequired,
};

export default ActionHeaderBtn;
