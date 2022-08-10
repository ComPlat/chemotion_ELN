import React from 'react';
import PropTypes from 'prop-types';

import AreaTitle from 'src/components/qc/components/summary/AreaTitle';
import AreaSummary from 'src/components/qc/components/summary/AreaSummary';

import BlockTitle from 'src/components/qc/components/substance/BlockTitle';
import BlockHnmr from 'src/components/qc/components/substance/BlockHnmr';
import BlockCnmr from 'src/components/qc/components/substance/BlockCnmr';
import BlockMS from 'src/components/qc/components/substance/BlockMS';
import BlockIr from 'src/components/qc/components/substance/BlockIr';
import BlockEa from 'src/components/qc/components/substance/BlockEa';
import BlockConclusion from 'src/components/qc/components/substance/BlockConclusion';

import { prismQcs } from 'src/components/qc/utils/qcs';
import { evaluateMs } from 'src/components/qc/utils/ms';
import { evaluateIr } from 'src/components/qc/utils/ir';
import { evaluateNmr } from 'src/components/qc/utils/nmr';

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
