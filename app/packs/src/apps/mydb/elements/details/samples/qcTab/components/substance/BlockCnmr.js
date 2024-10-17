import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Accordion } from 'react-bootstrap';

import QuillViewer from 'src/components/QuillViewer';
import QcMolView from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/QcMolView';
import { iconByMargin } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/icon';
import {
  tableNmr,
  formatQV,
} from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/nmr';

const emptyBlock = () => (
  <div className="card-qc">
    <h5>
      <span>2 Analysis of the provided digital NMR spectroscopy data: 13C NMR:</span>
    </h5>
    <div className="card-qc">
      <Alert variant="danger">
        No Information. Please upload spectrum & make predictions in Spectra Editor.
      </Alert>
    </div>
  </div>
);

const BlockCnmr = ({ ansCnmr }) => {
  if (!ansCnmr.exist) return emptyBlock();
  const { qck, qcp } = ansCnmr;
  const {
    shifts,
    svg,
    desc,
    sigSent,
    sigReal,
    numAll,
    numAcpMac,
    numAcpOwn,
    ansMac,
    ansOwn,
  } = qcp;
  const {
    countExpAtoms,
    countIdnAtoms,
    ansQck,
  } = qck;

  return (
    <div className="card-qc">
      <h5>
        <span>2 Analysis of the provided digital NMR spectroscopy data: 13C NMR:</span>
      </h5>
      <div className="card-qc">
        <div
          style={{ display: 'inline' }}
        >
          <QuillViewer
            value={formatQV(desc)}
          />
        </div>
        <div>
          <span>
            Expected carbons: {countExpAtoms}.
            Identified carbons: {countIdnAtoms}.
          </span>
          {iconByMargin(ansQck, 0)}
        </div>
        <div>
          <span>
            Signals detected: {sigSent}
          </span>
        </div>
        <div>
          <span>
            Signals detected (NMRShiftDB): {sigReal}
          </span>
        </div>
        <div>
          <span>
            Correctly assigned (machine):
            ({numAcpMac}/{numAll})
            {iconByMargin(ansMac, 1)}
          </span>
        </div>
        <div>
          <span>
            Correctly assigned (owner):
            ({numAcpOwn}/{numAll})
            {iconByMargin(ansOwn, 0)}
          </span>
        </div>

        <Accordion id="qc-detail-panel-cnmr">
          <Accordion.Item eventKey="qc-detail-panel-cnmr">
            <Accordion.Header>
              13C NMR Prediction Detail
            </Accordion.Header>
            <Accordion.Body>
              <QcMolView svg={svg} />
              {tableNmr(shifts)}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};

BlockCnmr.propTypes = {
  ansCnmr: PropTypes.object.isRequired,
};

export default BlockCnmr;
