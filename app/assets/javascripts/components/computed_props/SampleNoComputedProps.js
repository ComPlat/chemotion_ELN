import React from 'react';
import { Button } from 'react-bootstrap';

function SampleNoComputedProps({ computeFunc }) {
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

SampleNoComputedProps.propTypes = {
  computeFunc: React.PropTypes.func.isRequired,
};

export default SampleNoComputedProps;
