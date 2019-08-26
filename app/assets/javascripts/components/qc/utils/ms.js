import { FN } from 'react-spectra-viewer';

import { makeDav } from './common';
import { contentToText } from '../../utils/quillFormat';
import { emwInStr } from '../../utils/ElementUtils';

const emm = s => s.molecule_exact_molecular_weight.toFixed(2);

const isMatchMass = (xs, emMass) => {
  const emw = parseFloat(emMass, 10);
  const margin = 1.0;
  let result = false;

  xs.forEach((x) => {
    if (Math.abs(x - (emw + 0.0)) <= margin) { result = true; }
    if (Math.abs(x - (emw + 1.0)) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x - (emw + 23.0)) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x - (emw + 39.0)) <= margin) { result = true; } // eslint-disable-line
  });

  return result;
};

const getDesc = (xs, ys) => {
  const maxY = Math.max(...ys);
  const peaks = xs.map((x, idx) => ({ x, y: ys[idx] }));
  const signal = FN.formatedMS(peaks, maxY);
  return signal;
};

const makeQck = (ops, sample) => {
  if (!ops) return {};
  const emw = parseFloat(emm(sample), 10);
  const opStr = contentToText({ ops });
  const ansQck = emwInStr(emw, opStr);
  return { ansQck };
};

const makeQcp = (pred, sample) => {
  if (!pred || !pred.output || !pred.output.result || !pred.output.result[0]) {
    return {};
  }

  const { scan, xs, ys } = pred.output.result[0];

  const emMass = emm(sample);
  const matchMass = isMatchMass(xs, emMass);
  const desc = getDesc(xs, ys); // TBD
  return {
    matchMass, emMass, scan, desc,
  };
};

const evaluateMs = (msQc, sample) => {
  const {
    exist, hasFiles, hasValidFiles, ops, pred,
  } = msQc;

  const dav = makeDav(hasFiles, hasValidFiles);
  const qck = makeQck(ops, sample);
  const qcp = makeQcp(pred, sample);
  const { matchMass } = qcp;
  const conclusion = matchMass;
  const conclusionOwn = matchMass;

  return {
    exist, dav, qck, qcp, conclusion, conclusionOwn,
  };
};

export { evaluateMs } // eslint-disable-line
