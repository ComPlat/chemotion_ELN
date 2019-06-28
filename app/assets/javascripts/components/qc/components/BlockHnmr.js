import React from 'react';
import PropTypes from 'prop-types';

import QuillViewer from '../../QuillViewer';
import QcMolView from './helper/qc_mol_view';
import { iconByMargin } from './helper/icon';
import {
  tableNmr,
  formatQV,
} from './helper/nmr';

const emptyBlock = () => (
  <div className="card-qc">
    <h5>
      <span>1. Analysis of the provided digital NMR spectroscopy data: 1H NMR:</span>
    </h5>
    <div className="card-qc">
      <p>
        <span>- - -</span>
      </p>
    </div>
  </div>
);

const BlockHnmr = ({ hnmrQc, ansHnmr }) => {
  if (Object.keys(ansHnmr).length === 0) return emptyBlock();
  const { pred, ops } = hnmrQc;
  const { shifts, svgs } = pred.output.result[0];
  const {
    sigSent,
    sigReal,
    numAll,
    numAcpMac,
    numAcpOwn,
    ansMac,
    ansOwn,
  } = ansHnmr;

  return (
    <div className="card-qc">
      <h5>
        <span>1. Analysis of the provided digital NMR spectroscopy data: 1H NMR:</span>
      </h5>
      <div className="card-qc">
        <div>
          <span>Analysis according to user:</span>
          <div className="card-qc">
            <QuillViewer
              value={formatQV(ops)}
            />
          </div>
        </div>
        <div>
          <span>
            Amount of expected protons: xxx.
            Amount of identified protons: xxx.
          </span>
          { iconByMargin(false, 0) }
        </div>
        <div>
          <p>
            Amount of signals detected (signals sent to NMRShiftDB):
          </p>
          <p className="card-qc">
            { sigSent }
          </p>
        </div>
        <div>
          <p>
            Amount of signals detected (all entries listed in &lsquo;real&rsquo;):
          </p>
          <p className="card-qc">
            { sigReal }
          </p>
        </div>
        <div>
          <span>
            Number of correctly assigned signals according to machine:
            ({numAcpMac}/{numAll})
            { iconByMargin(ansMac, 1) }
          </span>
        </div>
        <div>
          <span>
            Number of correctly assigned signals according to owner:
            ({numAcpOwn}/{numAll})
            { iconByMargin(ansOwn, 0) }
          </span>
        </div>
        <QcMolView svg={svgs[0]} />
        { tableNmr(shifts, svgs[0]) }
      </div>
    </div>
  );
};

BlockHnmr.propTypes = {
  hnmrQc: PropTypes.object.isRequired,
  ansHnmr: PropTypes.object.isRequired,
};

export default BlockHnmr;
