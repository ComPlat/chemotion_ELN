import { numFormat } from './common';

import { contentToText } from '../../utils/quillFormat';
import {
  atomCountInFormula,
  atomCountInNMRDescription,
  atomCountCInNMRDescription,
} from '../../utils/ElementUtils';

const countSignal = (shifts) => {
  const numAll = shifts.length;
  let numAcpMac = 0;
  let numWarMac = 0;
  let numRjtMac = 0;
  let numMisMac = 0;
  let numAcpOwn = 0;
  shifts.forEach((s) => {
    if (s.status === 'accept') {
      numAcpMac += 1;
    } else if (s.status === 'warning') {
      numWarMac += 1;
    } else if (s.status === 'reject') {
      numRjtMac += 1;
    } else if (s.status === 'missing') {
      numMisMac += 1;
    }
    const ownAccept = (s.statusOwner && s.statusOwner === 'accept') ||
      (!s.statusOwner && s.status === 'accept');
    if (ownAccept) {
      numAcpOwn += 1;
    }
  });
  return {
    numAll, numAcpMac, numWarMac, numRjtMac, numMisMac, numAcpOwn,
  };
};

const extractSignal = (shifts) => {
  const reals = shifts.map(s => s.real)
    .filter(r => (r != null && r !== 0)).sort((a, b) => a - b);
  const sents = Array.from(new Set(reals)).sort((a, b) => a - b);

  const sigSent = sents.map(s => numFormat(s)).join(', ');
  const sigReal = reals.map(r => numFormat(r)).join(', ');

  return {
    sigSent, sigReal,
  };
};

const evaluateNmr = (typ, nmrQc, sumFormula) => {
  if (Object.keys(nmrQc).length === 0) return {};
  const { pred, ops } = nmrQc;
  const { shifts } = pred.output.result[0];
  const {
    sigSent, sigReal,
  } = extractSignal(shifts);
  const {
    numAll, numAcpMac, numAcpOwn,
  } = countSignal(shifts);
  const ansMac = numAll - numAcpMac <= 1;
  const ansOwn = numAll - numAcpOwn <= 0;
  const countExpAtoms = typ === '1H'
    ? atomCountInFormula(sumFormula, 'H')
    : atomCountInFormula(sumFormula, 'C');
  const opStr = contentToText({ ops });
  const countIdnAtoms = typ === '1H'
    ? atomCountInNMRDescription(opStr)
    : atomCountCInNMRDescription(opStr);
  const ansDesc = (countExpAtoms - countIdnAtoms) === 0;
  const conclusionNmr = ansMac && ansOwn && ansDesc;

  return {
    sigSent,
    sigReal,
    numAll,
    numAcpMac,
    numAcpOwn,
    ansMac,
    ansOwn,
    countExpAtoms,
    countIdnAtoms,
    conclusionNmr,
  };
};

export { evaluateNmr } // eslint-disable-line
