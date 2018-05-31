import React from 'react';
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
  computeFunc: React.PropTypes.func.isRequired,
};

export default NoComputedProps;
