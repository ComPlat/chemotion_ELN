const extractInfer = (ai, files) => {
  let targetPred = false;
  let targetTyp = false;
  let hasInfer = false;
  let hasFiles = false;
  let hasValidFiles = false;
  const valids = ['json', 'peaked', 'edited'];
  ai.children.forEach((dt) => {
    hasFiles = dt.attachments.length > 0;
    dt.attachments.forEach((att) => {
      if (valids.indexOf(att.aasm_state) > -1) hasValidFiles = true;
      if (att.aasm_state !== 'json') return;
      const pred = files
        .map(f => (f.id === att.id ? f : null))
        .filter(r => r != null)[0];
      if (!pred || pred.predictions.outline.code >= 300) return;
      targetTyp = pred.predictions.output.result[0].type;
      targetPred = pred.predictions;
      hasInfer = true;
    });
  });
  return {
    pred: targetPred, type: targetTyp, hasInfer, hasFiles, hasValidFiles,
  };
};

const buildQcs = (sample, infer) => {
  const { files } = infer.result;
  let irQc = {};
  let msQc = {};
  let hnmrQc = {};
  let cnmrQc = {};
  sample.container.children[0].children.forEach((ai) => {
    const { content, kind } = ai.extended_metadata;
    const { ops } = content;
    const inferO = extractInfer(ai, files);
    const { type } = inferO;
    if (type === 'ms' || kind === 'Mass') {
      msQc = Object.assign({}, msQc, inferO, { ops, exist: true, type: 'Mass' });
    } else if (type === 'nmr;13C;1d' || kind === '13C NMR') {
      cnmrQc = Object.assign({}, cnmrQc, inferO, { ops, exist: true, type: '13C NMR' });
    } else if (type === 'nmr;1H;1d' || kind === '1H NMR') {
      hnmrQc = Object.assign({}, hnmrQc, inferO, { ops, exist: true, type: '1H NMR' });
    } else if (type === 'ir' || kind === 'IR') {
      irQc = Object.assign({}, irQc, inferO, { ops, exist: true, type: 'IR' });
    }
  });
  return {
    irQc, msQc, hnmrQc, cnmrQc,
  };
};

const prismQcs = (sample, infer) => {
  const qcs = buildQcs(sample, infer);
  return qcs;
};

export { prismQcs }; // eslint-disable-line
