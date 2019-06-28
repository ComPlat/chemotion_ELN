const emm = s => s.molecule_exact_molecular_weight.toFixed(2);

const isMatchMass = (msQc, sample) => {
  const qc = msQc.pred.output.result[0];
  const emMass = parseFloat(emm(sample), 10);
  const margin = 1.0;
  let result = false;

  qc.xs.forEach((x) => {
    if (Math.abs(x - (emMass + 0.0)) <= margin) { result = true; }
    if (Math.abs(x - (emMass + 1.0)) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x - (emMass + 23.0)) <= margin) { result = true; } // eslint-disable-line
    if (Math.abs(x - (emMass + 39.0)) <= margin) { result = true; } // eslint-disable-line
  });

  return result;
};

const evaluateMs = (msQc, sample) => {
  if (Object.keys(msQc).length === 0) return {};
  return (
    { conclusionMs: isMatchMass(msQc, sample) }
  );
};

export { emm, isMatchMass, evaluateMs } // eslint-disable-line
