import React from 'react';
import PropTypes from 'prop-types';

import { iconByBool } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/icon';
import Label from 'src/components/legacyBootstrap/Label'

const iconNmr = (ansNmr) => {
  const { conclusion, conclusionOwn } = ansNmr;
  if (!conclusion && conclusionOwn) {
    return (
      <Label variant="success" className="label-qc">
        Pass due to owner correction
      </Label>
    );
  }
  return iconByBool(conclusion);
};

const iconIr = (ansIr) => {
  const { conclusion, conclusionOwn } = ansIr;
  if (!conclusion && conclusionOwn) {
    return (
      <Label variant="success" className="label-qc">
        Pass due to owner correction
      </Label>
    );
  }
  return iconByBool(conclusion);
};

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
        {iconNmr(ansHnmr)}
      </p>
      <p>
        <span>13C NMR</span>
        {iconNmr(ansCnmr)}
      </p>
      <p>
        <span>MS</span>
        {iconByBool(ansMs.conclusion)}
      </p>
      <p>
        <span>IR</span>
        {iconIr(ansIr)}
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
