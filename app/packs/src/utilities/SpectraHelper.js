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

const BuildSpectraComparedInfos = (sample, container) => {
  if (!sample || !container) return [];
  const { analyses_compared } = container.extended_metadata;
  if (!analyses_compared) return [];
  return analyses_compared.map(data => (
    {
      idx: data.file.id,
      info: data
    }
  ));
}

const BuildSpectraComparedSelection = (sample) => {
  if (!sample) return [];
  const filteredAttachments = (dataset) => {
    if (dataset) {
      const filtered = dataset.attachments.filter((attch) => {
        const position = attch.filename.search(/[.]jdx$/);
        return position > 0;
      });
      return filtered;
    }
    return false;
  };

  const listComparible = sample.getAnalysisContainersComparable();
  const menuItems = Object.keys(listComparible).map((layout) => {
    const listAics = listComparible[layout].map((aic)=> {
      const { children } = aic;
      let subSubMenu = null;
      if (children) {
        subSubMenu = children.map((dts) => {
          const attachments = filteredAttachments(dts);
          const dataSetName = dts.name;
          if (!attachments) {
            return { title: dataSetName, value: dts, checkable: false };
          }
          const spectraItems = attachments.map((item) => {
            return { title: item.filename, key: item.id, value: item.id }
          });
          return { title: dts.name, key: dts.id, value: dts, checkable: false , children: spectraItems };
        });
      }
      return { title: aic.name, key: aic.id, children: subSubMenu, checkable: false };
    });
    return { title: layout, key: layout, value: layout, children: listAics, checkable: false }
  });
  return menuItems;
};

const GetSelectedComparedAnalyses = (container, treeData, selectedFiles, info) => {
  const getParentNode = (key, tree) => {
    let parentNode;
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some(item => item.key === key)) {
          parentNode = node;
        } else if (getParentNode(key, node.children)) {
          parentNode = getParentNode (key, node.children);
        }
      }
    }
    return parentNode;
  }

  const selectedData = selectedFiles.map((fileID, idx) => {
    const dataset = getParentNode(fileID, treeData);
    const analysis = getParentNode(dataset.key, treeData);
    const layout = getParentNode(analysis.key, treeData);
    return { 
      file: { name: info[idx], id: fileID },
      dataset: { name: dataset.title, id: dataset.key },
      analysis: { name: analysis.title, id: analysis.key },
      layout: layout.title,
     }
  });
  return selectedData;
};

export {
  BuildSpcInfos, BuildSpcInfosForNMRDisplayer,
  JcampIds, isNMRKind, BuildSpectraComparedInfos,
  BuildSpectraComparedSelection, GetSelectedComparedAnalyses
}; // eslint-disable-line
