import React from 'react';
import PropTypes from 'prop-types';

import {
  BadgeNotAvailable,
  BadgeSuccess,
  BadgeFail,
  BadgeDefault,
} from './common';

/*
const tpUv = (
  <Tooltip id="tpUv">
    UV
  </Tooltip>
);

const tpXr = (
  <Tooltip id="tpXr">
    X-ray
  </Tooltip>
);
*/

const LineTitle = () => (
  <div className="card-qcsum">
    <span className="qc-title qc-placeholder">.</span>
    <span><strong>1H</strong></span>
    <span><strong>13C</strong></span>
    <span><strong>MS</strong></span>
    <span><strong>IR</strong></span>
    <span><strong>UV</strong></span>
    <span><strong>X-ray</strong></span>
    <span><strong>Rf</strong></span>
  </div>
);

const statusLabel = (status) => {
  if (status === undefined) return <BadgeNotAvailable />;
  return status ? <BadgeSuccess /> : <BadgeFail />;
};

const LineQcp = ({
  ansHnmr, ansCnmr, ansMs, ansIr,
}) => (
  <div className="card-qcsum">
    <span className="qc-title">QC-pass</span>
    <span>{ statusLabel(ansHnmr.conclusion) }</span>
    <span>{ statusLabel(ansCnmr.conclusion) }</span>
    <span>{ statusLabel(ansMs.conclusion) }</span>
    <span>{ statusLabel(ansIr.conclusion) }</span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
  </div>
);

LineQcp.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

const LineQck = ({ ansHnmr, ansCnmr, ansMs }) => (
  <div className="card-qcsum">
    <span className="qc-title">Quick Check</span>
    <span>{ statusLabel(ansHnmr.qck.ansQck) }</span>
    <span>{ statusLabel(ansCnmr.qck.ansQck) }</span>
    <span>{ statusLabel(ansMs.qck.ansQck) }</span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
  </div>
);

LineQck.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
};

const LineDav = ({
  ansHnmr, ansCnmr, ansMs, ansIr,
}) => (
  <div className="card-qcsum">
    <span className="qc-title">Data Availability</span>
    <span>{ statusLabel(ansHnmr.dav) }</span>
    <span>{ statusLabel(ansCnmr.dav) }</span>
    <span>{ statusLabel(ansMs.dav) }</span>
    <span>{ statusLabel(ansIr.dav) }</span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
    <span><BadgeDefault /></span>
  </div>
);

LineDav.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

export { LineTitle, LineQcp, LineQck, LineDav };
