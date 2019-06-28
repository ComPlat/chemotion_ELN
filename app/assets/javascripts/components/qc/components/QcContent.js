import React from 'react';
import PropTypes from 'prop-types';

import BlockTitle from './BlockTitle';
import BlockHnmr from './BlockHnmr';
import BlockCnmr from './BlockCnmr';
import BlockMS from './BlockMS';
import BlockIr from './BlockIr';
import BlockEa from './BlockEa';
import BlockConclusion from './BlockConclusion';

import { prismQcs } from '../utils/qcs';
import { evaluateMs } from '../utils/ms';
import { evaluateIr } from '../utils/ir';
import { evaluateNmr } from '../utils/nmr';

const QcContent = ({ sample, infer }) => {
  const {
    irQc, msQc, hnmrQc, cnmrQc,
  } = prismQcs(sample, infer);

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

QcContent.propTypes = {
  sample: PropTypes.object.isRequired,
  infer: PropTypes.object.isRequired,
};

export default QcContent;
