import React from 'react';
import PropTypes from 'prop-types';

import AreaTitle from 'src/components/elements/samples/qc_tab/components/summary/AreaTitle';
import AreaSummary from 'src/components/elements/samples/qc_tab/components/summary/AreaSummary';

import BlockTitle from 'src/components/elements/samples/qc_tab/components/substance/BlockTitle';
import BlockHnmr from 'src/components/elements/samples/qc_tab/components/substance/BlockHnmr';
import BlockCnmr from 'src/components/elements/samples/qc_tab/components/substance/BlockCnmr';
import BlockMS from 'src/components/elements/samples/qc_tab/components/substance/BlockMS';
import BlockIr from 'src/components/elements/samples/qc_tab/components/substance/BlockIr';
import BlockEa from 'src/components/elements/samples/qc_tab/components/substance/BlockEa';
import BlockConclusion from 'src/components/elements/samples/qc_tab/components/substance/BlockConclusion';

import { prismQcs } from 'src/components/elements/samples/qc_tab/utils/qcs';
import { evaluateMs } from 'src/components/elements/samples/qc_tab/utils/ms';
import { evaluateIr } from 'src/components/elements/samples/qc_tab/utils/ir';
import { evaluateNmr } from 'src/components/elements/samples/qc_tab/utils/nmr';

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
