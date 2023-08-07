const acceptables = ['jdx', 'dx', 'jcamp', 'mzml', 'mzxml', 'raw', 'cdf', 'zip'];

const JcampIds = (container) => {
  let origJcampIds = [];
  let geneJcampIds = [];
  let editedJcampsIds = [];

  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
        const typ = fns.length > 1 ? fns[fns.length - 2] : false;
        const notOrig = typ === 'peak' || typ === 'edit';
        if (isJcamp) {
          if (notOrig) {
            geneJcampIds = [...geneJcampIds, att.id];
            editedJcampsIds = [...editedJcampsIds, att.id];
          } else {
            origJcampIds = [...origJcampIds, att.id];
          }
        }
      } catch (err) {
        // just ignore
      }
    });
  });
  return { orig: origJcampIds, gene: geneJcampIds, edited: editedJcampsIds };
};

const extractJcampFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
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
  return files;
};

const extractJcampWithFailedFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isJcamp = acceptables.indexOf(ext.toLowerCase()) >= 0;
        const isApp = [
          'idle', 'queueing', 'done',
          'backup', 'image', 'non_jcamp',
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
  return files;
};

const extractNMRiumFiles = (container) => {
  let files = [];
  container.children.forEach((dt) => {
    dt.attachments.forEach((att) => {
      try {
        const fns = att.filename.split('.');
        const ext = fns[fns.length - 1];
        const isNMRium = ext.toLowerCase() === 'nmrium';

        if (isNMRium) {
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
  return files;
};

const extractAnalysesId = (sample, container) => {
  let idAe = null;
  sample && sample.analysesContainers().forEach((ae) => {
    ae.children.forEach((ai) => {
      if (container.id === ai.id) {
        idAe = ae.id;
      }
    });
  });
  return idAe;
};

const BuildSpcInfos = (sample, container) => {
  if (!sample || !container) return [];
  const files = extractJcampFiles(container);
  if (files.length < 1) return [];
  const idAe = extractAnalysesId(sample, container);
  return files.map((file) => (
    {
      value: null,
      label: file.filename,
      title: sample.short_label,
      idSp: sample.id,
      idAe,
      idAi: container.id,
      idDt: file.idDt,
      idx: file.id,
    }
  ));
};

const BuildSpcInfosForNMRDisplayer = (sample, container) => {
  if (!sample || !container) return [];
  let files = extractJcampWithFailedFiles(container);
  const nmriumFiles = extractNMRiumFiles(container);
  files.push(...nmriumFiles);
  if (files.length < 1) return [];
  const idAe = extractAnalysesId(sample, container);
  return files.map((file) => (
    {
      value: null,
      label: file.filename,
      title: sample.short_label,
      idSp: sample.id,
      idAe,
      idAi: container.id,
      idDt: file.idDt,
      idx: file.id,
    }
  ));
};

const isNMRKind = (container) => {
  if (!(container && container.extended_metadata && container.extended_metadata.kind)) return false;
  const { extended_metadata } = container; // eslint-disable-line
  const { kind } = extended_metadata; // eslint-disable-line
  return kind.toLowerCase().includes('nuclear magnetic resonance');
};

export { BuildSpcInfos, BuildSpcInfosForNMRDisplayer, JcampIds, isNMRKind }; // eslint-disable-line
