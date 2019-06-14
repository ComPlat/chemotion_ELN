const buildQcs = (sample) => {
  let qcs = [];
  sample.container.children[0].children.forEach((ai) => {
    const { ops } = ai.extended_metadata.content;
    ai.children.forEach((dt) => {
      dt.attachments.forEach((att) => {
        if (att.predictions.length === 0) return;
        const pred = att.predictions[0];
        const { type } = pred.decision.output.result[0];
        qcs = [...qcs, { pred, ops, type }];
      });
    });
  });
  return qcs;
};

const prismQcs = (sample) => {
  const qcs = buildQcs(sample);
  let irQc = null;
  let msQc = null;
  let hnmrQc = null;
  let cnmrQc = null;
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
