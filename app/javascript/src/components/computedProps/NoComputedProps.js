import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

function NoComputedProps({ computeFunc }) {
  return (
    <span>
      No computed properties found.
      <Button
        variant="success"
        size="sm"
        onClick={computeFunc}
      >
        <i className="fa fa-paper-plane me-1" />
        Compute
      </Button>
    </span>
  );
}

NoComputedProps.propTypes = {
  computeFunc: PropTypes.func.isRequired,
};

export default NoComputedProps;
