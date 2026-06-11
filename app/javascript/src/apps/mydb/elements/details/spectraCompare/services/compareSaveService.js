import { FN } from '@complat/react-spectra-editor';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { cleanLayoutLabel } from '../utils/containerLayout';

const rmRefreshed = (analysis) => {
  if (!analysis) return analysis;
  const { refreshed, ...coreAnalysis } = analysis;
  return coreAnalysis;
};

const buildEditedDataSpectrum = (payload, curveIdx, si) => {
  const hasShiftArray = Array.isArray(payload?.shift?.shifts);
  const fPeaks = payload?.peaks && hasShiftArray
    ? FN.rmRef(payload.peaks, payload.shift, curveIdx)
    : payload?.peaks;
  const selectedShift = payload?.shift?.shifts ? payload.shift.shifts[curveIdx] : payload?.shift;
  const selectedIntegration = payload?.integration?.integrations
    ? payload.integration.integrations[curveIdx]
    : payload?.integration;
  const selectedMultiplicity = payload?.multiplicity?.multiplicities
    ? payload.multiplicity.multiplicities[curveIdx]
    : payload?.multiplicity;

  const peakList = Array.isArray(fPeaks) ? fPeaks : [];
  return {
    si,
    peaksStr: FN.toPeakStr(peakList),
    selectedShift,
    shiftSelectX: selectedShift?.peak?.x,
    shiftRefName: selectedShift?.ref?.name,
    shiftRefValue: selectedShift?.ref?.value,
    scan: payload?.scan,
    thres: payload?.thres,
    integration: JSON.stringify(selectedIntegration),
    multiplicity: JSON.stringify(selectedMultiplicity),
    predict: JSON.stringify(rmRefreshed(payload?.analysis)),
    keepPred: payload?.keepPred,
    waveLengthStr: JSON.stringify(payload?.waveLength),
    cyclicvolta: JSON.stringify(payload?.cyclicvoltaSt),
    curveIdx,
    simulatenmr: payload?.simulatenmr ?? false,
    axesUnits: JSON.stringify(payload?.axesUnitsSt),
    detector: JSON.stringify(payload?.detectorSt),
    dscMetaData: JSON.stringify(payload?.dscMetaData),
  };
};

const resolveDatasetTargetId = (container) => {
  const datasetChild = (container?.children || []).find(
    (c) => c?.container_type === 'dataset',
  );
  return datasetChild ? datasetChild.id : container?.id;
};

const replaceDatasetChild = (container, dataset) => {
  if (!dataset) return container?.children || [];
  const children = Array.isArray(container?.children) ? [...container.children] : [];
  const idx = children.findIndex((c) => c.id === dataset.id);
  if (idx === -1) return [...children, dataset];
  const next = [...children];
  next[idx] = dataset;
  return next;
};

export const applyCombineResponse = (container, response) => {
  if (!container) return container;
  if (!response) return container;
  const { dataset, analyses_compared: analysesCompared } = response;
  const previousMeta = container.extended_metadata || {};

  const layoutFromCmp = previousMeta.kind || cleanLayoutLabel(container.comparable_info?.layout);

  const nextChildren = replaceDatasetChild(container, dataset);
  const nextComparable = {
    ...(container.comparable_info || {}),
    list_attachments: dataset?.attachments || container.comparable_info?.list_attachments || [],
    list_dataset: container.comparable_info?.list_dataset || [],
    list_analyses: container.comparable_info?.list_analyses || [],
    layout: container.comparable_info?.layout || null,
    is_comparison: true,
  };

  return {
    ...container,
    children: nextChildren,
    extended_metadata: {
      ...previousMeta,
      analyses_compared: Array.isArray(analysesCompared) ? analysesCompared : [],
      is_comparison: true,
      kind: previousMeta.kind || layoutFromCmp || null,
    },
    comparable_info: nextComparable,
  };
};

export const saveCompareSpectra = async (options, deps = {}) => {
  const combineSpectraComparison = deps.combineSpectraComparison
    || AttachmentFetcher.combineSpectraComparison.bind(AttachmentFetcher);
  const {
    container,
    spectra = [],
    payloads = [],
    frontCurveIdx = 0,
  } = options || {};

  if (!container) {
    throw new Error('saveCompareSpectra: missing container');
  }
  if (!Array.isArray(payloads) || payloads.length === 0) {
    throw new Error('saveCompareSpectra: no payloads to save');
  }

  const datasetTargetId = resolveDatasetTargetId(container);
  const selectedFiles = (container.extended_metadata?.analyses_compared || [])
    .map((entry) => entry?.file?.id)
    .filter((id) => id != null);

  const editedDataSpectra = payloads.map((payload, idx) => {
    const curveIdx = payload?.curveSt?.curveIdx ?? payload?.curveIdx ?? idx;
    const si = spectra[curveIdx] || spectra[idx] || spectra[0] || null;
    return buildEditedDataSpectrum(payload, curveIdx, si);
  });

  let response;
  try {
    response = await combineSpectraComparison(
      selectedFiles,
      datasetTargetId,
      frontCurveIdx,
      editedDataSpectra,
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    error.compareSave = true;
    throw error;
  }

  if (!response || response.status === false || response.error) {
    const message = response?.message || response?.error || 'combine_spectra_comparison failed';
    const error = new Error(message);
    error.compareSave = true;
    error.response = response;
    throw error;
  }

  const updated = applyCombineResponse(container, response);
  return {
    container: updated,
    dataset: response.dataset || null,
    analysesCompared: response.analyses_compared || [],
    spectraIds: selectedFiles,
    frontCurveIdx,
  };
};

export default saveCompareSpectra;
