import React from 'react';
import PropTypes from 'prop-types';

import { iconMs } from './helper/icon';
import { emm } from '../utils/ms';

const content = (msQc) => {
  const qc = msQc.pred.decision.output.result[0];
  const maxY = Math.max(...qc.ys);
  const signals = qc.xs.map((x, idx) => (
    `${x.toFixed(2)} (${parseInt(((100 * qc.ys[idx]) / maxY), 10)}%)`
  ));
  return signals.join(', ');
};

const scan = (msQc) => {
  const qc = msQc.pred.decision.output.result[0];
  return qc.scan;
};

const BlockMS = ({ msQc, sample, ansMs }) => (
  <div className="card-qc">
    <h5>
      <span>3 Analysis of the provided digital mass spectrometry data:</span>
    </h5>
    <div className="card-qc">
      <p>
        <span>Identified Mass peaks (<i>m/z</i>) = </span>
        { content(msQc) }
      </p>
      <p>
        <span>Selected scan: {scan(msQc)}.</span>
      </p>
      <p>
        <span>Exact molecular mass = </span>
        { emm(sample) }
      </p>
      <p>
        <span>Conclusion: </span>
        { iconMs(ansMs.conclusionMs) }
      </p>
    </div>
  </div>
);

BlockMS.propTypes = {
  msQc: PropTypes.object.isRequired,
  sample: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
};

export default BlockMS;
