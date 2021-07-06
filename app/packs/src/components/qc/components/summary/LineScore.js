import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import { evalMsg, evalLabel, evalScoreTxt } from './eval';

const tpMsg = score => (
  <Tooltip id="tp-msg">
    { evalMsg(score) }
  </Tooltip>
);

const LineScore = ({ score }) => {
  const clsName = evalLabel(score);
  const scoreTxt = evalScoreTxt(score);

  return (
    <OverlayTrigger placement="top" overlay={tpMsg(score)}>
      <div className={clsName}>
        <span className="txt-qcsum-score">{ scoreTxt }</span>
      </div>
    </OverlayTrigger>
  );
};

LineScore.propTypes = {
  score: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
};

export default LineScore;
