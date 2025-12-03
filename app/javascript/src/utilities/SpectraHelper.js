import { FN } from '@complat/react-spectra-editor';
import Sample from 'src/models/Sample';

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

const listNMROntology = (chmos, storedSet, parentIsNMR = false) => {
  if (Array.isArray(chmos)) {
    chmos.forEach((obj) => {
      const { children } = obj;
      if (children && children.length > 0) {
        children.forEach((child) => {
          listNMROntology(child, storedSet);
        });
      } else {
        return storedSet;
      }
    });
  } else {
    const { children, value } = chmos;
    let isNMR = parentIsNMR;
    if (value && (value.toLowerCase().includes('nuclear magnetic resonance') || parentIsNMR)) {
      storedSet.add(value);
      isNMR = true;
    } else if (typeof chmos === 'string' && (chmos.toLowerCase().includes('nuclear magnetic resonance') || parentIsNMR)) {
      storedSet.add(value);
      isNMR = true;
    } else {
      isNMR = false;
    }
    if (children && children.length > 0) {
      children.forEach((child) => {
        listNMROntology(child, storedSet, isNMR);
      });
    } else {
      return storedSet;
    }
  }
  return storedSet;
};

const isNMRKind = (container, chmos = []) => {
  if (!(container && container.extended_metadata && container.extended_metadata.kind)) return false;
  const { extended_metadata } = container; // eslint-disable-line
  const { kind } = extended_metadata; // eslint-disable-line
  let setToBeStored = new Set([]);
  const ontologies = Array.from(listNMROntology(chmos, setToBeStored));
  const filtered = ontologies.filter((ontology) => {
    return kind === ontology || kind.toLowerCase().includes(ontology);
  });
  return filtered.length > 0;
};

const cleaningNMRiumData = (nmriumData) => {
  if (!nmriumData) return null;
  const cleanedNMRiumData = { ...nmriumData };

  const { data } = cleanedNMRiumData;
  if (!data) return cleanedNMRiumData;

  const { spectra } = data;
  if (!spectra) return cleanedNMRiumData;

  const newSpectra = spectra.map((spc) => {
    const tmpSpc = { ...spc };
    delete tmpSpc.originalData;
    return tmpSpc;
  });

  data.spectra = [...newSpectra];

  return cleanedNMRiumData;
};

const inlineNotation = (layout, data, metadata) => {
  let formattedString = '';
  let quillData = [];
  if (!data) return { quillData, formattedString };

  const {
    scanRate, voltaData, sampleName
  } = data;
  const {
    cvConc, cvSolvent, cvSolventOthers, cvRef, cvRefOthers, cvScanRate,
  } = metadata;

  switch (layout) {
    case FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY: {
      if (!voltaData) {
        break;
      }
      let refString = '';
      let nonRefString = '';
      let refOps = [];
      const nonRefOps = [];
      const { listPeaks, xyData } = voltaData;
      const { x } = xyData;
      listPeaks.forEach((item) => {
        const {
          isRef, e12, max, min,
        } = item;
        const e12Str = e12 ? FN.strNumberFixedLength(e12, 3) : '0';
        let scanRateStr = cvScanRate ? cvScanRate : '0';
        scanRateStr = scanRateStr === '0' && scanRate ? FN.strNumberFixedLength(scanRate, 3) : scanRateStr;
        if (isRef) {
          const posNegString = x[0] > x[1] ? 'neg.' : 'pos.';
          const concentrationStr = cvConc || '<conc. of sample>';
          const solventStr = (cvSolvent === 'others' ? cvSolventOthers : cvSolvent) || '<solvent>';
          let internalRefStr = "(Fc+/Fc)";
          refOps = [
            { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ` },
            { insert: `(Fc` },
            { insert: '+', attributes: { script: 'super' } },
            { insert: `/Fc) ` },
            { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
          ];
          if (cvRef === 'decamethylferrocene') {
            internalRefStr = "(Me10Fc+/Me10Fc)";
            refOps = [
              { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ` },
              { insert: `(Me` },
              { insert: '10', attributes: { script: 'sub' } },
              { insert: `Fc` },
              { insert: '+', attributes: { script: 'super' } },
              { insert: `/Me` },
              { insert: '10', attributes: { script: 'sub' } },
              { insert: `Fc) ` },
              { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
            ];
          }
          else if (cvRefOthers) {
            internalRefStr = `(${cvRefOthers})`;
            refOps = [
              { insert: `CV (${concentrationStr} in ${solventStr} vs. Ref ${internalRefStr} ` },
              { insert: `= ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):` },
            ];
          }
          refString = `CV (${concentrationStr} in ${solventStr} vs. Ref ${internalRefStr} = ${e12Str} V, v = ${scanRateStr} V/s, to ${posNegString}):`;

        } else {
          const delta = (max && min) ? FN.strNumberFixedLength(Math.abs(max.x - min.x) * 1000, 3) : '0';
          nonRefString += `\nE1/2 = ([${sampleName}] , ΔEp) = ${e12Str} V (${delta} mV)`;
          const currentNoneOps = [
            { insert: '\nE' },
            { insert: '1/2', attributes: { script: 'sub' } },
            { insert: ` = ([${sampleName}] , ΔE` },
            { insert: 'p', attributes: { script: 'sub' } },
            { insert: `) = ${e12Str} V (${delta} mV)` },
          ];
          nonRefOps.push(...currentNoneOps);
        }
      });

      formattedString = refString + nonRefString;
      quillData = [...refOps, ...nonRefOps];
      break;
    }
    default:
      break;
  }

  return { quillData, formattedString };
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

const BuildSpectraComparedSelection = (sample, comparisonContainer) => {
  if (!sample) return { menuItems: [], selectedFiles: [] };

  let targetLayout =
  comparisonContainer?.extended_metadata?.kind
  || comparisonContainer?.comparable_info?.layout
  || null;

  if (targetLayout) {
    targetLayout = targetLayout.replace(/^Type:\s*/i, '').split('|').pop().trim();
    if (targetLayout === 'null' || targetLayout === 'Not specified') {
      targetLayout = null;
    }
  } else {
    targetLayout = null;
  }

  // FIX : accept également les fichiers "peak_compared_xxx.jdx"
  const filteredAttachments = (dataset) => {
    if (!dataset || !Array.isArray(dataset.attachments)) return [];
  
    return dataset.attachments.filter((attch) => {
      const ext = attch.filename.split('.').pop().toLowerCase();
      const isJcamp = ['jdx','dx','jcamp'].includes(ext);
      const allowed = attch.filename.match(/(peak|edit|compared)/i);
      return isJcamp && allowed;
    });
  };
  
  const comparisonDatasets = comparisonContainer.children || [];
  let comparisonFiles = [];

  comparisonDatasets.forEach(ds => {
    const att = filteredAttachments(ds);
    comparisonFiles.push(...att);
  });

  const listComparible = sample.getAnalysisContainersComparable();
  const listKeys = Object.keys(listComparible);

  let menuItems = listKeys.map((layoutKey) => {
    const listAics = listComparible[layoutKey].map((aicOrigin) => {

      const aic = (comparisonContainer && aicOrigin.id === comparisonContainer.id)
        ? comparisonContainer
        : aicOrigin;

      const rawLayout =
      aic.extended_metadata?.kind
      || aic.comparable_info?.layout
      || layoutKey
      || null;
      
      const aicLayout = rawLayout
        ? rawLayout.replace(/^Type:\s*/i, '').split('|').pop().trim()
        : null;

      const disableAIC = targetLayout && aicLayout !== targetLayout;

      let subSubMenu = (aic.children || [])
        .map((dts) => {
          const attachments = filteredAttachments(dts);
          if (!attachments || attachments.length === 0) return null;

          const spectraItems = attachments.map((item) => ({
            title: item.filename,
            key: item.id,
            value: item.id,
            disabled: disableAIC
          }));

          return {
            title: `Dataset: ${dts.name}`,
            key: dts.id,
            value: dts.id,
            disabled: disableAIC,
            checkable: false,
            children: spectraItems
          };
        })
        .filter(Boolean);

      return {
        title: aic.comparable_info?.is_comparison
          ? `Comparison: ${aic.name}`
          : `Analysis: ${aic.name}`,
        key: aic?.id,
        value: aic?.id,
        disabled: disableAIC,
        checkable: false,
        children: subSubMenu
      };

    }).filter(node => node.children?.length > 0);

    if (listAics.length === 0) return null;

    const disableLayout = targetLayout && layoutKey !== targetLayout;

    return {
      title: layoutKey ? `Type: ${layoutKey}` : 'Type: Not specified',
      key: layoutKey || 'no_type',
      value: layoutKey || 'no_type',
      disabled: disableLayout,
      checkable: false,
      children: listAics
    };
  }).filter(Boolean);

  let selectedFiles = [];

  if (comparisonContainer.extended_metadata?.analyses_compared) {
    const rawSelected = comparisonContainer.extended_metadata.analyses_compared.map(a => a.file.id);

    const fileIdsInTree = new Set();

    const collectFileIds = (nodes) => {
      if (!nodes) return;
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          collectFileIds(node.children);
        } else {
          fileIdsInTree.add(node.key);
        }
      });
    };

    collectFileIds(menuItems);

    selectedFiles = rawSelected.filter(id => fileIdsInTree.has(id));
  }

  return { menuItems, selectedFiles };
};


const GetSelectedComparedAnalyses = (container, treeData, selectedFiles, extra) => {
  if (!Array.isArray(selectedFiles) || !extra) return [];

  const checked = extra.checkedNodes || extra.allCheckedNodes || [];

  const findNode = (key, tree) => {
    for (const node of tree) {
      if (node.key === key) return node;
      if (node.children) {
        const found = findNode(key, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const findParent = (key, tree) => {
    for (const node of tree) {
      if (node.children?.some(c => c.key === key)) return node;
      if (node.children) {
        const found = findParent(key, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  return selectedFiles.map(fileID => {
    const fileNode = findNode(fileID, treeData);
    const datasetNode = findParent(fileID, treeData);
    const analysisNode = datasetNode ? findParent(datasetNode.key, treeData) : null;
    const layoutNode = analysisNode ? findParent(analysisNode.key, treeData) : null;

    return {
      file: { id: fileID, name: fileNode?.title || `File ${fileID}` },
      dataset: datasetNode ? { id: datasetNode.key, name: datasetNode.title } : { id: null, name: null },
      analysis: analysisNode ? { id: analysisNode.key, name: analysisNode.title } : { id: null, name: null },
      layout: layoutNode ? layoutNode.title : null,
    };
  });
};

const ProcessSampleWithComparisonAnalyses = (sample, spectraStore) => {
  const { spcIdx, prevIdx } = spectraStore;
  const newSample = new Sample(sample);

  const comparableContainers = newSample.getAnalysisContainersComparable();
  const categories = Object.keys(comparableContainers);

  categories.forEach((layout) => {
    comparableContainers[layout].forEach((container) => {
      const metadata = container.extended_metadata;
      const cmp = metadata.analyses_compared;

      if (!cmp) return;

      const updated = cmp.map(entry => {
        const file = entry.file;

        if (file.id === prevIdx && !spectraStore.newAttachmentIds) {
          return {
            ...entry,
            file: { ...file, id: spcIdx }
          };
        }
        return entry;
      });

      metadata.analyses_compared = updated;
    });
  });

  return newSample;
};

export {
  BuildSpcInfos, BuildSpcInfosForNMRDisplayer,
  JcampIds, isNMRKind, cleaningNMRiumData, inlineNotation, BuildSpectraComparedInfos,
  BuildSpectraComparedSelection, GetSelectedComparedAnalyses, ProcessSampleWithComparisonAnalyses,
}; // eslint-disable-line
