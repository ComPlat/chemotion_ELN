const buildQcs = (sample, infer) => {
  const { files } = infer.result;
  let qcs = [];
  sample.container.children[0].children.forEach((ai) => {
    const { ops } = ai.extended_metadata.content;
    ai.children.forEach((dt) => {
      dt.attachments.forEach((att) => {
        if (att.aasm_state !== 'json') return;
        const pred = files
          .map(f => (f.id === att.id ? f : null))
          .filter(r => r != null)[0];
        if (!pred) return;
        const { type } = pred.predictions.output.result[0];
        qcs = [...qcs, { ops, type, pred: pred.predictions }];
      });
    });
  });
  return qcs;
};

const prismQcs = (sample, infer) => {
  const qcs = buildQcs(sample, infer);
  let irQc = {};
  let msQc = {};
  let hnmrQc = {};
  let cnmrQc = {};
  qcs.forEach((qc) => {
    switch (qc.type) {
      case 'ir':
        irQc = qc;
        break;
      case 'ms':
        msQc = qc;
        break;
      case 'nmr;13C;1d':
        cnmrQc = qc;
        break;
      case 'nmr;1H;1d':
        hnmrQc = qc;
        break;
      default:
        console.log('Trouble Shooting: ', qc); // eslint-disable-line
    }
  });

  return {
    irQc, msQc, hnmrQc, cnmrQc,
  };
};

export { prismQcs }; // eslint-disable-line
