import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Accordion } from 'react-bootstrap';

import QcMolView from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/QcMolView';
import { iconByMargin } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/icon';
import { tableIr } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/ir';

const emptyBlock = () => (
  <div className="card-qc">
    <h5>
      <span>4 Analysis of the provided digital IR data:</span>
    </h5>
    <div className="card-qc">
      <Alert variant="danger">
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
          <span>Amount of functional groups given: {numFg}</span>
        </div>
        <div>
          <span>
            Amount of functional groups that were part of the routine and
            accurracy &gt;80%: {numFg80 + numFg90}
          </span>
        </div>
        <div>
          <span>Output true machine (&gt;80%): </span>
          {`${(posMac80 + posMac90)}/${(numMac)}`}
          {iconByMargin(ansMac80, 1)}
        </div>
        <div>
          <span>Output true owner (&gt;80%): </span>
          {`${(posOwn80 + posOwn90)}/${(numOwn)}`}
          {iconByMargin(ansOwn80, 1)}
        </div>
        <div>
          <span>Output false machine (&gt;90%): </span>
          {`${(negMac90)}/${(posMac90 + negMac90)}`}
          {iconByMargin(ansMacF90, 0)}
        </div>
        <div>
          <span>Output false owner (&gt; 90%): </span>
          {`${(negOwn90)}/${(posOwn90 + negOwn90)}`}
          {iconByMargin(ansOwnF90, 0)}
        </div>

        <Accordion id="qc-detail-panel-ir">
          <Accordion.Item eventKey="qc-detail-panel-ir">
            <Accordion.Header>
              IR Prediction Detail
            </Accordion.Header>
            <Accordion.Body>
              <QcMolView svg={svg} />
              {tableIr(fgs)}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};

BlockIr.propTypes = {
  ansIr: PropTypes.object.isRequired,
};

export default BlockIr;
