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
  ansHnmr, ansCnmr, ansMs, ansIr, curation,
}) => {
  const score = evalScore(ansHnmr, ansCnmr, ansMs, ansIr, curation);
  return (
    <div>
      <div className="col-qcsum-l">
        <LineTitle />
        <LineDav
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
          ansIr={ansIr}
        />
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
  curation: PropTypes.number.isRequired,
};

export default AreaSummary;
