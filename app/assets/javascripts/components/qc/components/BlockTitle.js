import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

const infoTp = (
  <Tooltip id="tp-qc-info" className="card-qc">
    <p>ChemSpectra (0.4.17)</p>
    <p>NMRShiftDB (2.0.1)</p>
    <p>ChemSpectraDeepIr (0.4.17)</p>
  </Tooltip>
);

const BlockTitle = () => (
  <div>
    <h4>
      <span>Analysis of digital research data for plausibility</span>
    </h4>
    <h4>
      <span>Information </span>
      <OverlayTrigger
        placement="right"
        overlay={infoTp}
        style={{ marginLeft: '10px' }}
      >
        <i className="fa fa-info-circle" style={{ color: '#337ab7' }} />
      </OverlayTrigger>
    </h4>
    <h4>
      <span>Analysis</span>
    </h4>
  </div>
);

export default BlockTitle;
