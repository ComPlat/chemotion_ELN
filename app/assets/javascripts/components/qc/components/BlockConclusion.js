import React from 'react';
import PropTypes from 'prop-types';

import { iconByBool } from './helper/icon';

const BlockConclusion = ({
  ansHnmr, ansCnmr, ansMs, ansIr,
}) => {
  const { conclusionIr } = ansIr;

  return (
    <div>
      <h4>
        <span>Conclusion of the automated analysis check:</span>
      </h4>
      <div className="card-qc">
        <p>
          <span>1H NMR</span>
          { iconByBool(ansHnmr.conclusionNmr) }
        </p>
        <p>
          <span>13C NMR</span>
          { iconByBool(ansCnmr.conclusionNmr) }
        </p>
        <p>
          <span>MS</span>
          { iconByBool(ansMs.conclusionMs) }
        </p>
        <p>
          <span>IR</span>
          { iconByBool(conclusionIr) }
        </p>
      </div>
      <br />
    </div>
  );
};

BlockConclusion.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

export default BlockConclusion;
