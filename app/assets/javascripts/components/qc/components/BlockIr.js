import React from 'react';
import PropTypes from 'prop-types';

import { iconByMargin } from './helper/icon';
import { tableIr } from './helper/ir';

const BlockIr = ({ irQc, ansIr }) => {
  const {
    numFg, numFg80, numFg90,
    posMac80, posOwn80, posMac90, posOwn90,
    negMac90, negOwn90,
    numMac, numOwn,
    ansMac80, ansOwn80, ansMacF90, ansOwnF90,
  } = ansIr;

  return (
    <div className="card-qc">
      <h5>
        <span>4 Analysis of the provided digital IR data:</span>
      </h5>
      <div className="card-qc">
        <p>
          <span>Amount of functional groups given: { numFg }</span>
        </p>
        <p>
          <span>
            Amount of functional groups that were part of the routine and
            accurracy &gt;80%: { numFg80 + numFg90 }
          </span>
        </p>
        <p>
          <span>Output true machine (&gt;80%): </span>
          { `${(posMac80 + posMac90)}/${(numMac)}` }
          { iconByMargin(ansMac80, 1) }
        </p>
        <p>
          <span>Output true own (&gt;80%): </span>
          { `${(posOwn80 + posOwn90)}/${(numOwn)}` }
          { iconByMargin(ansOwn80, 1) }
        </p>
        <p>
          <span>Output false machine (&gt;90%): </span>
          { `${(negMac90)}/${(posMac90 + negMac90)}` }
          { iconByMargin(ansMacF90, 0) }
        </p>
        <p>
          <span>Output false own (&gt; 90%): </span>
          { `${(negOwn90)}/${(posOwn90 + negOwn90)}` }
          { iconByMargin(ansOwnF90, 0) }
        </p>
        { tableIr(irQc) }
      </div>
    </div>
  );
};

BlockIr.propTypes = {
  irQc: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

export default BlockIr;
