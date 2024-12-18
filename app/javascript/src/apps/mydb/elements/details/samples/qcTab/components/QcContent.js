import React from 'react';
import PropTypes from 'prop-types';

import AreaTitle from 'src/apps/mydb/elements/details/samples/qcTab/components/summary/AreaTitle';
import AreaSummary from 'src/apps/mydb/elements/details/samples/qcTab/components/summary/AreaSummary';

import BlockTitle from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockTitle';
import BlockHnmr from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockHnmr';
import BlockCnmr from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockCnmr';
import BlockMS from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockMS';
import BlockIr from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockIr';
import BlockEa from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockEa';
import BlockConclusion from 'src/apps/mydb/elements/details/samples/qcTab/components/substance/BlockConclusion';

import { prismQcs } from 'src/apps/mydb/elements/details/samples/qcTab/utils/qcs';
import { evaluateMs } from 'src/apps/mydb/elements/details/samples/qcTab/utils/ms';
import { evaluateIr } from 'src/apps/mydb/elements/details/samples/qcTab/utils/ir';
import { evaluateNmr } from 'src/apps/mydb/elements/details/samples/qcTab/utils/nmr';

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
    <div className="d-flex flex-column gap-5">
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
