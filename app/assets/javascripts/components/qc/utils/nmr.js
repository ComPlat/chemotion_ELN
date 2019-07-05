import { numFormat, makeDav } from './common';

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

const makeQck = (sumFormula, ops, type) => {
  if (!ops) return {};
  const is1H = type === '1H NMR';
  const countExpAtoms = is1H
    ? atomCountInFormula(sumFormula, 'H')
    : atomCountInFormula(sumFormula, 'C');
  const opStr = contentToText({ ops });
  const countIdnAtoms = is1H
    ? atomCountInNMRDescription(opStr)
    : atomCountCInNMRDescription(opStr);
  const ansQck = (countExpAtoms - countIdnAtoms) === 0;
  return { countExpAtoms, countIdnAtoms, ansQck };
};

const makeQcp = (pred, ops = []) => {
  const desc = [{ insert: 'According to user: ' }, ...ops];
  if (!pred || !pred.output || !pred.output.result || !pred.output.result[0]) {
    return { desc };
  }
  const { shifts, svgs } = pred.output.result[0];
  const svg = svgs ? svgs[0] : false;
  const {
    sigSent, sigReal,
  } = extractSignal(shifts);
  const {
    numAll, numAcpMac, numAcpOwn,
  } = countSignal(shifts);
  const ansMac = numAll - numAcpMac <= 1;
  const ansOwn = numAll - numAcpOwn <= 0;
  return {
    shifts,
    svg,
    desc,
    sigSent,
    sigReal,
    numAll,
    numAcpMac,
    numAcpOwn,
    ansMac,
    ansOwn,
  };
};

const evaluateNmr = (nmrQc, sumFormula) => {
  const {
    exist, hasFiles, hasValidFiles, ops, type, pred,
  } = nmrQc;

  const dav = makeDav(hasFiles, hasValidFiles);
  const qck = makeQck(sumFormula, ops, type);
  const qcp = makeQcp(pred, ops);
  const { ansQck } = qck;
  const { ansMac, ansOwn } = qcp;
  const conclusion = ansMac && ansOwn && ansQck;

  return {
    exist, dav, qck, qcp, conclusion,
  };
};

export { evaluateNmr } // eslint-disable-line
