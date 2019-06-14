import React from 'react';
import PropTypes from 'prop-types';

import BlockTitle from './components/BlockTitle';
import BlockHnmr from './components/BlockHnmr';
import BlockCnmr from './components/BlockCnmr';
import BlockMS from './components/BlockMS';
import BlockIr from './components/BlockIr';
import BlockEa from './components/BlockEa';
import BlockConclusion from './components/BlockConclusion';

import { prismQcs } from './utils/qcs';
import { evaluateMs } from './utils/ms';
import { evaluateIr } from './utils/ir';
import { evaluateNmr } from './utils/nmr';

const QualityCheckMain = ({ sample }) => {
  const {
    irQc, msQc, hnmrQc, cnmrQc,
  } = prismQcs(sample);

  const ansHnmr = evaluateNmr(hnmrQc);
  const ansCnmr = evaluateNmr(cnmrQc);
  const ansMs = evaluateMs(msQc, sample);
  const ansIr = evaluateIr(irQc);

  return (
    <div>
      <BlockTitle />
      <BlockHnmr
        hnmrQc={hnmrQc}
        ansHnmr={ansHnmr}
      />
      <BlockCnmr
        cnmrQc={cnmrQc}
        ansCnmr={ansCnmr}
      />
      <BlockMS
        msQc={msQc}
        sample={sample}
        ansMs={ansMs}
      />
      <BlockIr
        irQc={irQc}
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
  );
};

QualityCheckMain.propTypes = {
  sample: PropTypes.object.isRequired,
};

export default QualityCheckMain;
