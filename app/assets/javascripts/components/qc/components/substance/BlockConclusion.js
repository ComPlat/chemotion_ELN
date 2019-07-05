import React from 'react';
import PropTypes from 'prop-types';

import { iconByBool } from '../helper/icon';

const BlockConclusion = ({
  ansHnmr, ansCnmr, ansMs, ansIr,
}) => (
  <div>
    <h4>
      <span>Conclusion of the automated analysis check:</span>
    </h4>
    <div className="card-qc">
      <p>
        <span>1H NMR</span>
        { iconByBool(ansHnmr.conclusion) }
      </p>
      <p>
        <span>13C NMR</span>
        { iconByBool(ansCnmr.conclusion) }
      </p>
      <p>
        <span>MS</span>
        { iconByBool(ansMs.conclusion) }
      </p>
      <p>
        <span>IR</span>
        { iconByBool(ansIr.conclusion) }
      </p>
    </div>
    <br />
  </div>
);

BlockConclusion.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

export default BlockConclusion;
