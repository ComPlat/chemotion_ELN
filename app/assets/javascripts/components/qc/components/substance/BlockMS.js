import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

import { iconMs } from '../helper/icon';

const emptyBlock = () => (
  <div className="card-qc">
    <h5>
      <span>3 Analysis of the provided digital mass spectrometry data:</span>
    </h5>
    <div className="card-qc">
      <Alert bsStyle="danger">
        No Information. Please upload spectra to Spectra Viewer.
      </Alert>
    </div>
  </div>
);

const BlockMS = ({ ansMs }) => {
  if (!ansMs.exist) return emptyBlock();
  const { qcp, conclusion } = ansMs;
  const {
    emMass,
    scan,
    desc,
  } = qcp;

  return (
    <div className="card-qc">
      <h5>
        <span>3 Analysis of the provided digital mass spectrometry data:</span>
      </h5>
      <div className="card-qc">
        <div>
          <span>Identified Mass peaks (<i>m/z</i>) = </span>
          { desc }
        </div>
        <div>
          <span>Selected scan: { scan }.</span>
        </div>
        <div>
          <span>Exact molecular mass = </span>
          { emMass }
        </div>
        <div>
          <span>Conclusion: </span>
          { iconMs(conclusion) }
        </div>
      </div>
    </div>
  );
};

BlockMS.propTypes = {
  ansMs: PropTypes.object.isRequired,
};

export default BlockMS;
