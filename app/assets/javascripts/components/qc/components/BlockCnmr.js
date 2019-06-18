import React from 'react';
import PropTypes from 'prop-types';

import QuillViewer from '../../QuillViewer';
import { iconByMargin } from './helper/icon';
import {
  tableNmr,
  formatQV,
} from './helper/nmr';

const BlockCnmr = ({ cnmrQc, ansCnmr }) => {
  const { pred, ops } = cnmrQc;
  const { shifts } = pred.decision.output.result[0];
  const {
    sigSent,
    sigReal,
    numAll,
    numAcpMac,
    numAcpOwn,
    ansMac,
    ansOwn,
  } = ansCnmr;

  return (
    <div className="card-qc">
      <h5>
        <span>2 Analysis of the provided digital NMR spectroscopy data: 13C NMR</span>
      </h5>
      <div className="card-qc">
        <p>
          <span>Analysis according to user:</span>
          <div className="card-qc">
            <QuillViewer
              value={formatQV(ops)}
            />
          </div>
        </p>
        <p>
          <span>
            Amount of expected protons: xxx.
            Amount of identified protons: xxx.
          </span>
          { iconByMargin(false, 0) }
        </p>
        <p>
          <p>
            Amount of signals detected (signals sent to NMRShiftDB):
          </p>
          <p className="card-qc">
            { sigSent }
          </p>
        </p>
        <p>
          <p>
            Amount of signals detected (all entries listed in &lsquo;real&rsquo;):
          </p>
          <p className="card-qc">
            { sigReal }
          </p>
        </p>
        <p>
          <span>
            Number of correctly assigned signals according to machine:
            ({numAcpMac}/{numAll})
            { iconByMargin(ansMac, 1) }
          </span>
        </p>
        <p>
          <span>
            Number of correctly assigned signals according to owner:
            ({numAcpOwn}/{numAll})
            { iconByMargin(ansOwn, 0) }
          </span>
        </p>
        { tableNmr(shifts) }
      </div>
    </div>
  );
};

BlockCnmr.propTypes = {
  cnmrQc: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
};

export default BlockCnmr;
