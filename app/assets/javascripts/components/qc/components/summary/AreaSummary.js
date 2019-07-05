import React from 'react';
import PropTypes from 'prop-types';

import LineScore from './LineScore';
import {
  LineTitle,
  LineQcp,
  LineQck,
  LineDav,
} from './LineSummary';
import { evalScore } from './eval';

const AreaSummary = ({
  ansHnmr, ansCnmr, ansMs, ansIr,
}) => {
  const score = evalScore(ansHnmr, ansCnmr, ansMs, ansIr);
  return (
    <div>
      <div className="col-qcsum-l">
        <LineTitle />
        <LineQcp
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
          ansIr={ansIr}
        />
        <LineQck
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
        />
        <LineDav
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
          ansIr={ansIr}
        />
      </div>
      <div className="col-qcsum-r">
        <LineScore score={score} />
      </div>
    </div>
  );
};

AreaSummary.propTypes = {
  ansHnmr: PropTypes.object.isRequired,
  ansCnmr: PropTypes.object.isRequired,
  ansMs: PropTypes.object.isRequired,
  ansIr: PropTypes.object.isRequired,
};

export default AreaSummary;
