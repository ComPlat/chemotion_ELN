const emm = s => s.molecule_exact_molecular_weight.toFixed(2);

const isMatchMass = (msQc, sample) => {
  const qc = msQc.pred.decision.output.result[0];
  const emMass = parseFloat(emm(sample), 10);
  const margin = 1.0;
  let result = false;

  qc.xs.forEach((x) => {
    if (Math.abs(x - emMass) <= margin) { result = true; }
    if (Math.abs(x + 1.0 - emMass) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x + 23.0 - emMass) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x + 39.0 - emMass) <= margin) { result = true; } // eslint-disable-line
  });

  return result;
};

const evaluateMs = (msQc, sample) => (
  {
    conclusionMs: isMatchMass(msQc, sample),
  }
);

export { emm, isMatchMass, evaluateMs } // eslint-disable-line
