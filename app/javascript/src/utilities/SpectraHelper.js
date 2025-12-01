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

  let targetLayout = comparisonContainer?.comparable_info?.layout || null;
  if (targetLayout) {
    targetLayout = targetLayout.replace(/^Type:\s*/i, '').split('|').pop().trim();
    if (targetLayout === 'null' || targetLayout === 'Not specified') {
      targetLayout = null;
    }
  } else {
    targetLayout = null;
  }

  const filteredAttachments = (dataset) => {
    if (!dataset) return false;
    return dataset.attachments.filter((attch) =>
      attch.filename.match(/[._](edit|peak|compared)(_[0-9]+)?\.(jdx|dx|jcamp)$/i)
    );
  };

  const listComparible = sample.getAnalysisContainersComparable();
  const listKeys = Object.keys(listComparible);

  const menuItems = listKeys.map((layoutKey) => {

    const listAics = listComparible[layoutKey].map((aic) => {

      const aicLayout = aic.comparable_info?.layout
        ? aic.comparable_info.layout.replace(/^Type:\s*/i, '').split('|').pop().trim()
        : (layoutKey || null);

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
        key: aic.id,
        value: aic.id,
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

  const allAICs =
    typeof sample.analysisContainers === 'function'
      ? sample.analysisContainers()
      : (sample.analysisContainers || []);

  let targetComparison = null;
  if (comparisonContainer?.comparable_info?.is_comparison) {
    targetComparison = comparisonContainer;
  }

  const selectedSet = new Set();
  if (targetComparison) {
    const jdxAttachments = targetComparison.attachments?.filter((att) => {
      const ext = att.filename.split('.').pop().toLowerCase();
      return ['jdx', 'dx', 'jcamp'].includes(ext);
    }) || [];

    if (jdxAttachments.length > 0) {
      jdxAttachments.forEach(att => selectedSet.add(att.id));
    } else {
      (targetComparison.comparable_info.list_attachments || [])
        .forEach(att => selectedSet.add(att.id));
    }
  }

  const validIds = new Set();
  const collectIds = (nodes) => {
    nodes?.forEach((n) => {
      if (n.children?.length) collectIds(n.children);
      if (!n.children && n.key != null) validIds.add(n.key);
    });
  };
  menuItems.forEach(item => collectIds(item.children));

  const selectedFiles = [...selectedSet].filter(id => validIds.has(id));

  return { menuItems, selectedFiles };
};

const GetSelectedComparedAnalyses = (container, treeData, selectedFiles, extra) => {
  if (!selectedFiles || !extra) {
    return [];
  }

  const labels = Array.isArray(extra) ? extra : (extra.allCheckedNodes || []);

  if (selectedFiles.length > labels.length) {
    console.error('Selected files and labels do not match');
    return [];
  }

  const getParentNode = (key, tree) => {
    let parentNode;
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some(item => item.key === key)) {
          parentNode = node;
        } else if (getParentNode(key, node.children)) {
          parentNode = getParentNode(key, node.children);
        }
      }
    }
    return parentNode;
  }

  const selectedData = selectedFiles.map((fileID, idx) => {
    const dataset = getParentNode(fileID, treeData);
    const analysis = dataset ? getParentNode(dataset.key, treeData) : null;
    const layout = analysis ? getParentNode(analysis.key, treeData) : null;

    const labelNode = labels.find(node => node.value === fileID);
    const filename = labelNode ? labelNode.title : `File ${fileID}`;

    const result = {
      file: { name: filename, id: fileID },
      dataset: dataset ? { name: dataset.title, id: dataset.key } : { name: 'Unknown', id: null },
      analysis: analysis ? { name: analysis.title, id: analysis.key } : { name: 'Unknown', id: null },
      layout: layout ? layout.title : 'Unknown',
    };

    return result;
  });

  return selectedData;
};

const ProcessSampleWithComparisonAnalyses = (sample, spectraStore) => {
  const { spcIdx, prevIdx } = spectraStore;
  const newSample = new Sample(sample);
  const comparableContainers = newSample.getAnalysisContainersComparable();
  const listComparibleKeys = Object.keys(comparableContainers);
  let comparisonContainers = [];
  listComparibleKeys.forEach((layout) => {
    const listAics = comparableContainers[layout];
    comparisonContainers = listAics.filter((aic) => {
      const { comparable_info } = aic;
      return comparable_info ? comparable_info.is_comparison : false;
    });
  });

  comparisonContainers.forEach((container) => {
    const { extended_metadata } = container;
    const { analyses_compared } = extended_metadata;
    if (analyses_compared) {
      const newListAtts = analyses_compared.map((att) => {
        const { file } = att;
        if (file.id === prevIdx && !spectraStore.newAttachmentIds) {
          const newFileInfo = Object.assign({}, file, { id: spcIdx });
          return Object.assign({}, att, { file: newFileInfo });
        }
        return att;
      });
      extended_metadata.analyses_compared = newListAtts;
    }
  });
  return newSample;
};

export {
  BuildSpcInfos, BuildSpcInfosForNMRDisplayer,
  JcampIds, isNMRKind, cleaningNMRiumData, inlineNotation, BuildSpectraComparedInfos,
  BuildSpectraComparedSelection, GetSelectedComparedAnalyses, ProcessSampleWithComparisonAnalyses,
}; // eslint-disable-line
