import React from 'react';
import PropTypes from 'prop-types';

import AreaTitle from './summary/AreaTitle';
import AreaSummary from './summary/AreaSummary';

import BlockTitle from './substance/BlockTitle';
import BlockHnmr from './substance/BlockHnmr';
import BlockCnmr from './substance/BlockCnmr';
import BlockMS from './substance/BlockMS';
import BlockIr from './substance/BlockIr';
import BlockEa from './substance/BlockEa';
import BlockConclusion from './substance/BlockConclusion';

import { prismQcs } from '../utils/qcs';
import { evaluateMs } from '../utils/ms';
import { evaluateIr } from '../utils/ir';
import { evaluateNmr } from '../utils/nmr';

const QcContent = ({ sample, infer, curation }) => {
  const {
    irQc, msQc, hnmrQc, cnmrQc,
  } = prismQcs(sample, infer);
  const sumFormula = sample.molecule_formula;

  const ansHnmr = evaluateNmr(hnmrQc, sumFormula);
  const ansCnmr = evaluateNmr(cnmrQc, sumFormula);
  const ansMs = evaluateMs(msQc, sample);
  const ansIr = evaluateIr(irQc);

  return (
    <div>
      <div>
        <AreaTitle
          curation={curation}
        />
        <AreaSummary
          curation={curation}
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
          ansIr={ansIr}
        />
      </div>
      <br />
      <br />
      <div>
        <BlockTitle />
        <BlockHnmr
          ansHnmr={ansHnmr}
        />
        <BlockCnmr
          ansCnmr={ansCnmr}
        />
        <BlockMS
          ansMs={ansMs}
        />
        <BlockIr
          ansIr={ansIr}
        />
        <BlockEa />
        <BlockConclusion
          ansHnmr={ansHnmr}
          ansCnmr={ansCnmr}
          ansMs={ansMs}
          ansIr={ansIr}
        />
      </div>
    </div>
  );
};

QcContent.propTypes = {
  sample: PropTypes.object.isRequired,
  infer: PropTypes.object.isRequired,
  curation: PropTypes.number.isRequired,
};

export default QcContent;
