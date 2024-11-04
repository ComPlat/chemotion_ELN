import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

function NoComputedProps({ computeFunc }) {
  return (
    <span>
      No computed properties found.
      <Button
        bsStyle="success"
        bsSize="small"
        className="button-right"
        onClick={computeFunc}
      >
        <i className="fa fa-paper-plane" />
        &nbsp;&nbsp; Compute
      </Button>
    </span>
  );
}

NoComputedProps.propTypes = {
  computeFunc: PropTypes.func.isRequired,
};

export default NoComputedProps;
