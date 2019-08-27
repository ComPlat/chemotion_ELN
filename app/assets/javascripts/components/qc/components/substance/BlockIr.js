import React from 'react';
import PropTypes from 'prop-types';
import { Panel, Alert } from 'react-bootstrap';

import QcMolView from '../helper/qc_mol_view';
import { iconByMargin } from '../helper/icon';
import { tableIr } from '../helper/ir';

const emptyBlock = () => (
  <div className="card-qc">
    <h5>
      <span>4 Analysis of the provided digital IR data:</span>
    </h5>
    <div className="card-qc">
      <Alert bsStyle="danger">
        No Information. Please upload spectra to Spectra Editor.
      </Alert>
    </div>
  </div>
);

const BlockIr = ({ ansIr }) => {
  if (!ansIr.exist) return emptyBlock();
  const { qcp } = ansIr;
  const {
    fgs, svg, numFg, numFg80, numFg90,
    posMac80, posOwn80, posMac90, posOwn90,
    negMac90, negOwn90,
    numMac, numOwn,
    ansMac80, ansOwn80, ansMacF90, ansOwnF90,
  } = qcp;

  return (
    <div className="card-qc">
      <h5>
        <span>4 Analysis of the provided digital IR data:</span>
      </h5>
      <div className="card-qc">
        <div>
          <span>Amount of functional groups given: { numFg }</span>
        </div>
        <div>
          <span>
            Amount of functional groups that were part of the routine and
            accurracy &gt;80%: { numFg80 + numFg90 }
          </span>
        </div>
        <div>
          <span>Output true machine (&gt;80%): </span>
          { `${(posMac80 + posMac90)}/${(numMac)}` }
          { iconByMargin(ansMac80, 1) }
        </div>
        <div>
          <span>Output true owner (&gt;80%): </span>
          { `${(posOwn80 + posOwn90)}/${(numOwn)}` }
          { iconByMargin(ansOwn80, 1) }
        </div>
        <div>
          <span>Output false machine (&gt;90%): </span>
          { `${(negMac90)}/${(posMac90 + negMac90)}` }
          { iconByMargin(ansMacF90, 0) }
        </div>
        <div>
          <span>Output false owner (&gt; 90%): </span>
          { `${(negOwn90)}/${(posOwn90 + negOwn90)}` }
          { iconByMargin(ansOwnF90, 0) }
        </div>
        <Panel
          className="qc-detail-panel"
          id="qc-detail-panel-ir"
          defaultExpanded={false}
        >
          <Panel.Heading>
            <Panel.Title className="qc-detail-panel-title" toggle>
              IR Prediction Detail
            </Panel.Title>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <QcMolView svg={svg} />
              { tableIr(fgs) }
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    </div>
  );
};

BlockIr.propTypes = {
  ansIr: PropTypes.object.isRequired,
};

export default BlockIr;
