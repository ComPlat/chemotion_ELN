import React from 'react';
import PropTypes from 'prop-types';
import { Panel, Alert } from 'react-bootstrap';

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
      <Alert bsStyle="danger">
        No Information. Please upload spectrum & make predictions in Spectra Viewer.
      </Alert>
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
    countExpAtoms,
    countIdnAtoms,
  } = ansHnmr;
  const mOps = [{ insert: 'According to user: ' }, ...ops];

  return (
    <div className="card-qc">
      <h5>
        <span>1. Analysis of the provided digital NMR spectroscopy data: 1H NMR:</span>
      </h5>
      <div className="card-qc">
        <div
          style={{ display: 'inline' }}
        >
          <QuillViewer
            value={formatQV(mOps)}
          />
        </div>
        <div>
          <span>
            Expected protons: {countExpAtoms}.
            Identified protons: {countIdnAtoms}.
          </span>
          { iconByMargin((countExpAtoms - countIdnAtoms) === 0, 0) }
        </div>
        <div>
          <span>
            Signals detected: { sigSent }
          </span>
        </div>
        <div>
          <span>
            Signals detected (NMRShiftDB): { sigReal }
          </span>
        </div>
        <div>
          <span>
            Correctly assigned (machine):
            ({numAcpMac}/{numAll})
            { iconByMargin(ansMac, 1) }
          </span>
        </div>
        <div>
          <span>
            Correctly assigned (owner):
            ({numAcpOwn}/{numAll})
            { iconByMargin(ansOwn, 0) }
          </span>
        </div>
        <Panel
          className="qc-detail-panel"
          id="qc-detail-panel-hnmr"
          defaultExpanded={false}
        >
          <Panel.Heading>
            <Panel.Title className="qc-detail-panel-title" toggle>
              1H NMR Prediction Detail
            </Panel.Title>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <QcMolView svg={svgs[0]} />
              { tableNmr(shifts) }
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    </div>
  );
};

BlockHnmr.propTypes = {
  hnmrQc: PropTypes.object.isRequired,
  ansHnmr: PropTypes.object.isRequired,
};

export default BlockHnmr;
