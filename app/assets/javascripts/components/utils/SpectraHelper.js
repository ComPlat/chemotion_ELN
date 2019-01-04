
const extractJcampFile = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = ext === 'dx' || ext === 'jdx';
        const isApp = [
          'idle', 'queueing', 'done',
          'backup', 'image',
          'failure', 'non_jcamp',
        ].indexOf(att.aasm_state) < 0;
        if (isJcamp && isApp) {
          const file = Object.assign({}, att, {
            idDt: dt.id,
          });
          files = [...files, file];
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return files[0];
};

const extractAnalysesId = (sample, container) => {
  let idAe = null;
  sample.analysesContainers().forEach((ae) => {
    ae.children.forEach((ai) => {
      if (container.id === ai.id) {
        idAe = ae.id;
      }
    });
  });
  return idAe;
};

const BuildSpcInfo = (sample, container) => {
  if (!sample || !container) return null;
  const file = extractJcampFile(container);
  if (!file) return null;
  const idAe = extractAnalysesId(sample, container);
  return {
    value: null,
    label: file.filename,
    title: sample.short_label,
    idSp: sample.id,
    idAe,
    idAi: container.id,
    idDt: file.idDt,
    idx: file.id,
  };
};

export { BuildSpcInfo }; // eslint-disable-line
