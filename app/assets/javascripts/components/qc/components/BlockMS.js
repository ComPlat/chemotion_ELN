import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

import { iconMs } from './helper/icon';
import { emm } from '../utils/ms';

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

const content = (msQc) => {
  const qc = msQc.pred.output.result[0];
  const maxY = Math.max(...qc.ys);
  const signals = qc.xs.map((x, idx) => (
    `${x.toFixed(2)} (${parseInt(((100 * qc.ys[idx]) / maxY), 10)}%)`
  ));
  return signals.join(', ');
};

const scan = (msQc) => {
  const qc = msQc.pred.output.result[0];
  return qc.scan;
};

const BlockMS = ({ msQc, sample, ansMs }) => {
  if (Object.keys(ansMs).length === 0) return emptyBlock();

  return (
    <div className="card-qc">
      <h5>
        <span>3 Analysis of the provided digital mass spectrometry data:</span>
      </h5>
      <div className="card-qc">
        <div>
          <span>Identified Mass peaks (<i>m/z</i>) = </span>
          { content(msQc) }
        </div>
        <div>
          <span>Selected scan: {scan(msQc)}.</span>
        </div>
        <div>
          <span>Exact molecular mass = </span>
          { emm(sample) }
        </div>
        <div>
          <span>Conclusion: </span>
          { iconMs(ansMs.conclusionMs) }
        </div>
      </div>
    </div>
  );
};

BlockMS.propTypes = {
  msQc: PropTypes.object.isRequired,
  sample: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
};

export default BlockMS;
