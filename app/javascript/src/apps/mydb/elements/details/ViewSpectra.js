/* eslint-disable react/forbid-prop-types */
import React, { createRef } from 'react';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';
import { Alert, Button } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import { Select } from 'src/components/common/Select';
import PropTypes from 'prop-types';
import TreeSelect from 'antd/lib/tree-select';
import { InlineMetadata } from 'chem-generic-ui';

import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';
import ResearchPlan from 'src/models/ResearchPlan';
import { inlineNotation } from 'src/utilities/SpectraHelper';

const rmRefreshed = (analysis) => {
  if (!analysis) return analysis;
  const { refreshed, ...coreAnalysis } = analysis;
  return coreAnalysis;
};

const layoutsWillShowMulti = [
  FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY,
  FN.LIST_LAYOUT.SEC,
  FN.LIST_LAYOUT.AIF,
  FN.LIST_LAYOUT.H1,
  FN.LIST_LAYOUT.C13,
  FN.LIST_LAYOUT.UVVIS,
  FN.LIST_LAYOUT.HPLC_UVVIS,
];

class ViewSpectra extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
    };

    this.onChange = this.onChange.bind(this);
    this.writeCommon = this.writeCommon.bind(this);
    this.writePeakOp = this.writePeakOp.bind(this);
    this.writeMpyOp = this.writeMpyOp.bind(this);
    this.writeCloseCommon = this.writeCloseCommon.bind(this);
    this.writeClosePeakOp = this.writeClosePeakOp.bind(this);
    this.writeCloseMpyOp = this.writeCloseMpyOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.saveCloseOp = this.saveCloseOp.bind(this);
    this.refreshOp = this.refreshOp.bind(this);
    this.closeOp = this.closeOp.bind(this);
    this.predictOp = this.predictOp.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
    this.formatPks = this.formatPks.bind(this);
    this.getContent = this.getContent.bind(this);
    this.getSpcInfo = this.getSpcInfo.bind(this);
    this.getQDescVal = this.getQDescVal.bind(this);
    this.buildOthers = this.buildOthers.bind(this);
    this.onSpectraDescriptionChanged = this.onSpectraDescriptionChanged.bind(this);
    this.isShowMultipleSelectFile = this.isShowMultipleSelectFile.bind(this);
    this.notationVoltammetry = this.notationVoltammetry.bind(this);
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  onChange(newState) {
    const origState = this.state;
    this.setState({ ...origState, ...newState });
  }

  opsSolvent(shift) {
    const { label } = shift.ref;

    switch (label) {
      case false:
        return [];
      case 'CDCl$3':
        return [
          { insert: 'CDCl' },
          { insert: '3', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'C$6D$1$2':
        return [
          { insert: 'C' },
          { insert: '6', attributes: { script: 'sub' } },
          { insert: 'D' },
          { insert: '12', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'CD2Cl2':
      case 'CD$2Cl$2':
        return [
          { insert: 'CD' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: 'Cl' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'D$2O':
        return [
          { insert: 'D' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: 'O' },
          { insert: ', ' },
        ];
      default:
        return [{ insert: `${label}, ` }];
    }
  }

  onDSSelectChange(e) {
    const { value } = e;
    const { spcInfos } = this.state;
    const sis = spcInfos.filter(x => x.idDt === value);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];
    SpectraActions.SelectIdx(si.idx, []);
  }

  getDSList() {
    const { sample } = this.props;
    const { spcInfos } = this.state;
    const spcDts = spcInfos.map(e => e.idDt);
    const dcs = sample.datasetContainers();
    const dcss = dcs.filter(e => spcDts.includes(e.id));
    return dcss;
  }

  isShowMultipleSelectFile(idx) {
    const { spcMetas, arrSpcIdx } = this.state;
    let spcs = false;
    if (arrSpcIdx.length > 0) {
      spcs = spcMetas.filter(x => arrSpcIdx.includes(x.idx));
    }
    else {
      spcs = spcMetas.filter(x => x.idx === idx);
    }

    if (spcs && spcs.length > 0) {
      const spc = spcs[0];
      const { jcamp } = spc;
      if (layoutsWillShowMulti.includes(jcamp.layout)) {
        return true;
      }
    }

    return false;
  }

  getContent() {
    const { spcMetas, spcIdx, arrSpcIdx, spcInfos } = this.state;
    if (arrSpcIdx.length > 1) {
      const listMuliSpcs = [];
      const listEntityFiles = [];
      for (let i = 0; i < arrSpcIdx.length; i++) {
        const idx = arrSpcIdx[i];
        const spc = spcMetas.filter(x => x.idx === idx)[0];
        if (spc) {
          const { jcamp } = spc;
          if (!layoutsWillShowMulti.includes(jcamp.layout)) {
            return spc;
          }
          listMuliSpcs.push(spc);
        }
        const entity = spcInfos.filter(x => x.idx === idx)[0];
        if (entity) {
          listEntityFiles.push(entity);
        }
      }
      return { listMuliSpcs: listMuliSpcs, listEntityFiles: listEntityFiles };
    } else {
      const sm = spcMetas.filter(x => x.idx === spcIdx)[0];
      return sm || spcMetas[0] || { jcamp: null, predictions: null };
    }
  }

  getSpcInfo(curveIdx = 0) {
    const { spcInfos, spcIdx, arrSpcIdx } = this.state;
    let selectedIdx = spcIdx;
    if (arrSpcIdx.length > 0) {
      selectedIdx = arrSpcIdx[curveIdx];
    }
    const sis = spcInfos.filter(x => x.idx === selectedIdx);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];
    return si;
  }

  getQDescVal() {
    const { sample } = this.props;
    const { spcInfos, spcIdx } = this.state;
    const sis = spcInfos.filter(x => x.idx === spcIdx);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];

    const ops = sample.analysesContainers().map((ae) => {
      if (ae.id !== si.idAe) return null;
      return ae.children.map((ai) => {
        if (ai.id !== si.idAi) return null;
        return ai.extended_metadata.content.ops; // eslint-disable-line
      }).filter(r => r !== null);
    }).filter(r => r !== null)[0][0];
    return ops;
  }

  formatPks({
    peaks, shift, layout, isAscend, decimal, body,
    isIntensity, integration, curveSt, waveLength
  }) {
    const layoutOpsObj = SpectraOps[layout];
    if (!layoutOpsObj) {
      return [];
    }

    const { curveIdx } = curveSt;
    const { shifts } = shift;
    const selectedShift = shifts[curveIdx];

    const { integrations } = integration;
    const selectedIntegration = integrations[curveIdx];

    if (!selectedShift || !selectedIntegration) {
      return [];
    }

    const content = this.getContent();
    let built = content?.jcamp ? FN.buildData(content.jcamp) : null;

    if (!built) {
      const listMuliSpcs = content?.listMuliSpcs;
      if (Array.isArray(listMuliSpcs) && listMuliSpcs.length) {
        const spc = listMuliSpcs[curveIdx] || listMuliSpcs[0];
        if (spc?.jcamp) built = FN.buildData(spc.jcamp);
      }
    }
    const entity = built?.entity;
    if (!entity) return [];

    const features = entity?.features;
    const f0 = Array.isArray(features)
      ? features[0]
      : (features?.editPeak || features?.autoPeak || features) || {};
    const temperature = entity?.temperature;

    let observeFrequency = Array.isArray(f0?.observeFrequency)
      ? f0.observeFrequency[0]
      : f0?.observeFrequency;
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';

    const boundary = (f0 && (typeof f0.maxY !== 'undefined') && (typeof f0.minY !== 'undefined'))
      ? { maxY: f0.maxY, minY: f0.minY }
      : undefined;

    const mBody = body || FN.peaksBody({
      peaks,
      layout,
      decimal,
      shift,
      isAscend,
      isIntensity,
      boundary,
      integration: selectedIntegration,
      waveLength,
      temperature
    });
    let solventDecimal = decimal
    if (FN.is13CLayout(layout)) {
      solventDecimal = 2
    }

    const { label, value, name } = selectedShift.ref;
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(solventDecimal)} ppm], ` : '';
    return [
      ...layoutOpsObj.head(freqStr, solvent),
      { insert: mBody },
      ...layoutOpsObj.tail(),
    ];
  }

  formatMpy({
    shift, isAscend, decimal,
    integration, multiplicity, layout, curveSt
  }) {
    const { curveIdx } = curveSt;
    const { shifts } = shift;
    const selectedShift = shifts[curveIdx];
    const { integrations } = integration;
    const selectedIntegration = integrations[curveIdx];
    const { multiplicities } = multiplicity;
    const selectedMutiplicity = multiplicities[curveIdx];
    const content = this.getContent();
    let built = content?.jcamp ? FN.buildData(content.jcamp) : null;

    if (!built) {
      const listMuliSpcs = content?.listMuliSpcs;
      if (Array.isArray(listMuliSpcs) && listMuliSpcs.length) {
        const spc = listMuliSpcs[curveIdx] || listMuliSpcs[0];
        if (spc?.jcamp) built = FN.buildData(spc.jcamp);
      }
    }
    const entity = built?.entity;
    if (!entity) return [];

    const features = entity?.features;
    const f0 = Array.isArray(features)
      ? features[0]
      : (features?.editPeak || features?.autoPeak || features) || {};

    let observeFrequency = Array.isArray(f0?.observeFrequency)
      ? f0.observeFrequency[0]
      : f0?.observeFrequency;
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
    // multiplicity
    const { refArea, refFactor, stack: isStack } = selectedIntegration;
    const shiftVal = selectedMutiplicity.shift;
    const ms = selectedMutiplicity.stack || [];
    const is = isStack || [];

    const macs = ms.map((m) => {
      const { peaks, mpyType, xExtent } = m;
      const { xL, xU } = xExtent || {};
      const it = is.find((i) => i.xL === xL && i.xU === xU) || { area: 0 };
      const area = refArea ? (it.area * refFactor) / refArea : 0;
      const center = FN.calcMpyCenter(peaks, shiftVal, mpyType);
      const xs = (m.peaks || []).map(p => p.x).sort((a, b) => a - b);
      const [aIdx, bIdx] = isAscend ? [0, xs.length - 1] : [xs.length - 1, 0];
      const mxA = mpyType === 'm' && xs.length ? (xs[aIdx] - shiftVal).toFixed(decimal) : 0;
      const mxB = mpyType === 'm' && xs.length ? (xs[bIdx] - shiftVal).toFixed(decimal) : 0;
      return { ...m, area, center, mxA, mxB };
    }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));
    let couplings = [].concat(...macs.map((m) => {
      const jsSorted = (m.js || []).slice().sort((a, b) => (isAscend ? a - b : b - a));
      const c = m.center;
      const type = m.mpyType || 'm';
      const it = Math.round(m.area || 0);
      const js = [].concat(...jsSorted.map(j => ([
        { insert: 'J', attributes: { italic: true } },
        { insert: ` = ${j.toFixed(1)} Hz` },
        { insert: ', ' },
      ])));
      const atomCount = layout === '1H' ? `, ${it}H` : '';
      const location = type === 'm'
        ? `${m.mxA}–${m.mxB}`
        : `${(c ?? 0).toFixed(decimal)}`;

      return jsSorted.length === 0
        ? [
            { insert: `${location} (${type}${atomCount})` },
            { insert: ', ' },
          ]
        : [
            { insert: `${location} (${type}, ` },
            ...js.slice(0, js.length - 1),
            { insert: `${atomCount})` },
            { insert: ', ' },
          ];
    }));
    couplings = couplings.slice(0, couplings.length - 1);
    const { label, value, name } = selectedShift.ref;
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(decimal)} ppm], ` : '';
    return [
      { attributes: { script: 'super' }, insert: layout.slice(0, -1) },
      { insert: `${layout.slice(-1)} NMR (${freqStr}${solvent}ppm) δ = ` },
      ...couplings,
      { insert: '.' },
    ];
  }

  resolveWriteParams(params) {
    const curveIdx = params?.curveSt?.curveIdx ?? 0;
    const spectraList = Array.isArray(params?.spectra_list) ? params.spectra_list : [];
    const spectrum = spectraList[curveIdx] || spectraList[0] || {};

    const peaks = spectrum.peaks ?? params.peaks;
    const layout = spectrum.layout ?? params.layout;
    const isAscend = spectrum.isAscend ?? params.isAscend;
    const decimal = spectrum.decimal ?? params.decimal;
    const isIntensity = spectrum.isIntensity ?? params.isIntensity;
    const waveLength = spectrum.waveLength ?? params.waveLength;
    const body = spectrum.body ?? params.body;
    const cyclicvoltaSt = spectrum.cyclicvoltaSt ?? params.cyclicvoltaSt;

    // Construct arrays indexed by curveIdx for formatPks/formatMpy compatibility
    const shifts = [];
    shifts[curveIdx] = spectrum.shift;
    const shift = spectrum.shift ? { shifts } : params.shift;

    const integrations = [];
    integrations[curveIdx] = spectrum.integration;
    const integration = spectrum.integration ? { integrations } : params.integration;

    const multiplicities = [];
    multiplicities[curveIdx] = spectrum.multiplicity;
    const multiplicity = spectrum.multiplicity ? { multiplicities } : params.multiplicity;

    // Preserve the curveIdx for downstream functions
    const curveSt = { curveIdx };

    return {
      peaks, shift, layout, isAscend, decimal, body,
      isIntensity, multiplicity, integration, cyclicvoltaSt, curveSt, waveLength,
    };
  }

  writeCommon(params, isMpy = false) {
    const {
      peaks, shift, layout, isAscend, decimal, body,
      isIntensity, multiplicity, integration, cyclicvoltaSt, curveSt, waveLength
    } = this.resolveWriteParams(params);

    const { sample, handleSampleChanged } = this.props;
    const si = this.getSpcInfo(curveSt?.curveIdx ?? 0);
    if (!si) return;

    let ops = [];
    if (['1H', '13C', '15N', '19F', '29Si', '31P'].includes(layout) && isMpy) {
      ops = this.formatMpy({
        multiplicity, integration, shift, isAscend, decimal, layout, curveSt
      });
    } else if (FN.isCyclicVoltaLayout(layout)) {
      ops = this.notationVoltammetry(cyclicvoltaSt, curveSt, layout, sample, si?.idDt);
    } else {
      ops = this.formatPks({
        peaks,
        shift,
        layout,
        isAscend,
        decimal,
        body,
        isIntensity,
        integration,
        curveSt,
        waveLength
      });
    }

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== si.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== si.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...ops,
        ];
        const firstOps = ai.extended_metadata.content.ops[0];
        if (firstOps && firstOps.insert && firstOps.insert === '\n') {
          ai.extended_metadata.content.ops.shift();
        }

      });
    });

    const cb = () => this.saveOp(params);
    handleSampleChanged(sample, cb);
  }

  notationVoltammetry(cyclicvoltaSt, curveSt, layout, sample, idDt) {
    const { spectraList } = cyclicvoltaSt;
    const { curveIdx } = curveSt;
    const selectedVolta = spectraList?.[curveIdx];
    if (!selectedVolta) return [];

    const content = this.getContent();
    let built = content?.jcamp ? FN.buildData(content.jcamp) : null;
    if (!built) {
      const spcs = content?.listMuliSpcs;
      if (Array.isArray(spcs) && spcs.length) {
        const spc = spcs[curveIdx] || spcs[0];
        if (spc?.jcamp) built = FN.buildData(spc.jcamp);
      }
    }
    const feature = built?.entity?.features?.[0] || built?.entity?.features || {};

    const scanRate = feature?.scanRate;
    const xyData = Array.isArray(feature?.data) ? feature.data[0] : { x: [], y: [] };
    const metadata = InlineMetadata(sample?.datasetContainers(), idDt);
    const data = {
      scanRate,
      voltaData: {
        listPeaks: selectedVolta.list,
        xyData,
      },
      sampleName: sample.name,
    };
    const desc = inlineNotation(layout, data, metadata);
    const { quillData } = desc;
    return quillData;
  }

  writePeakOp(params) {
    const isMpy = false;
    this.writeCommon(params, isMpy);
  }

  writeMpyOp(params) {
    const isMpy = true;
    this.writeCommon(params, isMpy);
  }

  getSavePayloads(params, overrideValues = {}) {
    const spectraList = Array.isArray(params?.spectra_list) ? params.spectra_list : [];
    return spectraList.map((payload) => ({
      ...payload,
      ...overrideValues,
      simulatenmr: overrideValues.simulatenmr ?? payload?.simulatenmr ?? false,
    }));
  }

  buildSerializedPayload(payload, curveIdx) {
    const hasShiftArray = Array.isArray(payload?.shift?.shifts);
    const fPeaks = payload?.peaks && hasShiftArray ? FN.rmRef(payload.peaks, payload.shift, curveIdx) : payload?.peaks;
    const selectedShift = payload.shift?.shifts ? payload.shift.shifts[curveIdx] : payload.shift;
    const selectedIntegration = payload.integration?.integrations ? payload.integration.integrations[curveIdx] : payload.integration;
    const selectedMultiplicity = payload.multiplicity?.multiplicities ? payload.multiplicity.multiplicities[curveIdx] : payload.multiplicity;

    return {
      peaksStr: FN.toPeakStr(fPeaks),
      predict: JSON.stringify(rmRefreshed(payload.analysis)),
      waveLengthStr: JSON.stringify(payload.waveLength),
      cyclicvolta: JSON.stringify(payload.cyclicvoltaSt),
      axesUnitsStr: JSON.stringify(payload.axesUnitsSt),
      detector: JSON.stringify(payload.detectorSt),
      dscMetaDataStr: JSON.stringify(payload.dscMetaData),
      selectedShift,
      integrationStr: JSON.stringify(selectedIntegration),
      multiplicityStr: JSON.stringify(selectedMultiplicity),
    };
  }

  async saveTarget(target, shouldCombineAfterBatch) {
    const { spcInfos, arrSpcIdx } = this.state;
    const previousSpcInfos = spcInfos.filter((spc) => (spc.idDt === target.si.idDt && arrSpcIdx.includes(spc.idx)));
    const serialized = this.buildSerializedPayload(target.payload, target.curveIdx);
    const isSaveCombined = FN.isCyclicVoltaLayout(target.payload.layout) && !shouldCombineAfterBatch;

    return new Promise((resolve) => {
      SpectraActions.SaveToFile.defer(
        target.si,
        serialized.peaksStr,
        serialized.selectedShift,
        target.payload.scan,
        target.payload.thres,
        serialized.integrationStr,
        serialized.multiplicityStr,
        serialized.predict,
        null,
        target.payload.keepPred,
        serialized.waveLengthStr,
        serialized.cyclicvolta,
        target.curveIdx,
        target.payload.simulatenmr,
        previousSpcInfos,
        isSaveCombined,
        serialized.axesUnitsStr,
        serialized.detector,
        serialized.dscMetaDataStr,
        (fetchedFiles, _spcInfo, errorMessage) => {
          const newIds = (fetchedFiles?.files || []).map((file) => file.id).filter(Boolean);
          resolve({ oldId: target.si.idx, newIds, errorMessage });
        },
      );
    });
  }

  async combineBatchIfNeeded(saveResults, targets, combineCurveIdx) {
    if (targets.length <= 1) return;
    const layout = targets[0]?.payload?.layout;
    if (!layoutsWillShowMulti.includes(layout)) return;

    const { spcInfos, arrSpcIdx } = this.state;
    const combineTarget = targets.find((target) => target.curveIdx === combineCurveIdx) || targets[0];
    const combineIdDt = combineTarget?.si?.idDt;
    const isSameDataset = !!combineIdDt && targets.every((target) => target.si?.idDt === combineIdDt);
    if (!isSameDataset) return;

    const replacedIds = saveResults
      .filter((result) => result.newIds.length > 0)
      .map((result) => result.oldId);
    const keptIds = spcInfos
      .filter((spc) => (spc.idDt === combineIdDt && arrSpcIdx.includes(spc.idx)))
      .map((spc) => spc.idx)
      .filter((id) => !replacedIds.includes(id));
    const newIds = saveResults.flatMap((result) => result.newIds);
    if (newIds.length === 0) return;

    const combineIds = [...new Set([...keptIds, ...newIds])];
    if (combineIds.length === 0) return;

    const combineSerialized = this.buildSerializedPayload(combineTarget.payload, combineCurveIdx);
    const combineExtras = {
      attachmentId: combineTarget?.si?.idx,
      peaksStr: combineSerialized.peaksStr,
      shiftSelectX: combineSerialized.selectedShift?.peak?.x,
      shiftRefName: combineSerialized.selectedShift?.ref?.name,
      shiftRefValue: combineSerialized.selectedShift?.ref?.value,
      scan: combineTarget.payload.scan,
      thres: combineTarget.payload.thres,
      integration: combineSerialized.integrationStr,
      multiplicity: combineSerialized.multiplicityStr,
      predict: combineSerialized.predict,
      keepPred: combineTarget.payload.keepPred,
      waveLength: combineSerialized.waveLengthStr,
      cyclicvolta: combineSerialized.cyclicvolta,
      curveIdx: combineCurveIdx,
      simulatenmr: combineTarget.payload.simulatenmr,
      axesUnits: combineSerialized.axesUnitsStr,
      detector: combineSerialized.detector,
      dscMetaData: combineSerialized.dscMetaDataStr,
    };

    await new Promise((resolve) => {
      SpectraActions.CombineSpectra.defer(
        combineIds,
        combineCurveIdx,
        combineExtras,
        () => resolve(),
      );
    });
  }

  saveOp(params) {
    const { handleSubmit } = this.props;
    if (!Array.isArray(params?.spectra_list) || params.spectra_list.length === 0) {
      console.warn('saveOp expects a non-empty spectra_list payload.'); // eslint-disable-line no-console
      return;
    }
    const payloads = this.getSavePayloads(params);
    const targets = payloads.map((payload, idx) => {
      const curveIdx = payload.curveSt?.curveIdx ?? payload.curveIdx ?? idx;
      const si = this.getSpcInfo(curveIdx);
      if (!si) return null;
      return { payload, curveIdx, si };
    }).filter(Boolean);
    if (targets.length === 0) return;

    const combineCurveIdx = params.curveSt?.curveIdx ?? targets[0].curveIdx;
    const shouldCombineAfterBatch = targets.length > 1
      && layoutsWillShowMulti.includes(targets[0].payload.layout);

    LoadingActions.start.defer();
    (async () => {
      const saveResults = [];
      for (const target of targets) {
        const result = await this.saveTarget(target, shouldCombineAfterBatch);
        saveResults.push(result);
      }
      await this.combineBatchIfNeeded(saveResults, targets, combineCurveIdx);
      handleSubmit();
    })().catch((errorMessage) => {
      console.log(errorMessage); // eslint-disable-line
      handleSubmit();
    });
  }

  refreshOp(params) {
    const hasSpectraList = Array.isArray(params?.spectra_list) && params.spectra_list.length > 0;
    const spectraList = hasSpectraList
      ? this.getSavePayloads(params, { simulatenmr: true })
      : [{ ...params, simulatenmr: true }];
    this.saveOp({
      ...params,
      spectra_list: spectraList,
    });
  }

  closeOp() {
    SpectraActions.ToggleModal.defer();
  }

  writeCloseCommon(params, isMpy = false) {
    this.writeCommon(params, isMpy);
    this.closeOp();
  }

  writeClosePeakOp(params) {
    const isMpy = false;
    this.writeCommon(params, isMpy);
    this.closeOp();
  }

  writeCloseMpyOp(params) {
    const isMpy = true;
    this.writeCommon(params, isMpy);
    this.closeOp();
  }

  saveCloseOp(params) {
    this.saveOp(params);
    this.closeOp();
  }

  getPeaksByLayout(peaks, layout, multiplicity, curveIdx = 0) {
    if (['IR'].indexOf(layout) >= 0) return peaks;
    if (['13C'].indexOf(layout) >= 0) return FN.CarbonFeatures(peaks, multiplicity);

    const { multiplicities } = multiplicity;
    const selectedMultiplicity = multiplicities[curveIdx];

    const { stack, shift } = selectedMultiplicity;
    const nmrMpyCenters = stack.map((stk) => {
      const { mpyType, peaks } = stk;
      return {
        x: FN.CalcMpyCenter(peaks, shift, mpyType),
        y: 0,
      };
    });
    const defaultCenters = [{ x: -1000.0, y: 0 }];
    return nmrMpyCenters.length > 0 ? nmrMpyCenters : defaultCenters;
  }

  predictOp({
    peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity,
    layout, curveSt,
  }) {
    const { handleSubmit } = this.props;
    const si = this.getSpcInfo();
    if (!si) return;
    const fPeaks = FN.rmRef(peaks, shift);
    const peaksStr = FN.toPeakStr(fPeaks);
    const predict = JSON.stringify(rmRefreshed(analysis));

    const { curveIdx } = curveSt;

    const targetPeaks = this.getPeaksByLayout(peaks, layout, multiplicity, curveIdx);

    const { multiplicities } = multiplicity;
    const selectedMultiplicity = multiplicities[curveIdx];
    const { shifts } = shift;
    const selectedShift = shifts[curveIdx];
    const { integrations } = integration;
    const selectedIntegration = integrations[curveIdx];

    // LoadingActions.start.defer();
    SpectraActions.InferRunning.defer();
    SpectraActions.InferSpectrum.defer(
      si,
      peaksStr,
      selectedShift,
      scan,
      thres,
      JSON.stringify(selectedIntegration),
      JSON.stringify(selectedMultiplicity),
      predict,
      targetPeaks,
      layout,
      handleSubmit,
      keepPred,
    );
  }

  buildOpsByLayout(et) {
    const { sample } = this.props;
    if (sample && sample instanceof ResearchPlan) {
      return [
        { name: 'write & save', value: this.saveOp },
        { name: 'write, save & close', value: this.saveCloseOp },
      ];
    }
    const updatable = sample && sample.can_update;    
    let baseOps = updatable ? [
      { name: 'write peak & save', value: this.writePeakOp },
      { name: 'write peak, save & close', value: this.writeClosePeakOp },
    ] : [];
    const isNmr = updatable && ['1H', '13C', '15N', '19F', '29Si', '31P'].includes(et.layout);
    if (isNmr) {
      baseOps = [
        ...baseOps,
        { name: 'write multiplicity & save', value: this.writeMpyOp },
        { name: 'write multiplicity, save & close', value: this.writeCloseMpyOp },
      ];
    }

    if (layoutsWillShowMulti.includes(et.layout)) {
      if (FN.isCyclicVoltaLayout(et.layout)) {
        baseOps = [
          ...baseOps,
          { name: 'save', value: this.writeCommon },
          { name: 'save & close', value: this.writeCloseCommon },
        ];
      } else {
        baseOps = [
          ...baseOps,
          { name: 'save', value: this.saveOp },
          { name: 'save & close', value: this.saveCloseOp },
        ];
      }
    }
    const saveable = updatable;
    if (saveable) {
      baseOps = [
        ...baseOps,
        { name: 'save', value: this.saveOp },
        { name: 'save & close', value: this.saveCloseOp },
      ];
    }
    baseOps = baseOps.filter((op, i, arr) => i === arr.findIndex(o => o.name === op.name));

    return baseOps;
  }

  buildOthers() {
    const { others } = this.state;

    return {
      others,
      addOthersCb: SpectraActions.AddOthers,
    };
  }

  renderAlert({ icon, title, message, variant }) {
    const { fetched } = this.state;
    return (
      <div className="d-flex h-100 justify-content-center align-items-center">
        {fetched ? (
          <Alert variant={variant}>
            <Alert.Heading>
              <i className={`fa ${icon} me-2`} />
              {title}
            </Alert.Heading>
            <p>{message}</p>
            <Button variant={variant} onClick={this.closeOp}>Click here to close the window...</Button>
          </Alert>
        ) : (
          <i className="fa fa-refresh fa-spin fa-3x fa-fw" />
        )}
      </div>
    );
  }

  renderEmpty() {
    return this.renderAlert({
      icon: 'fa-exclamation-triangle',
      title: 'No Spectra Found!',
      message: 'Please refresh the page!',
      variant: 'warning',
    });
  }

  renderInvalid() {
    return this.renderAlert({
      icon: 'fa-chain-broken',
      title: 'Invalid spectrum!',
      message: 'Please delete it and upload a valid file!',
      variant: 'danger',
    });
  }

  renderSpectraEditor(jcamp, predictions, listMuliSpcs, listEntityFiles) {
    const { sample } = this.props;
    const {
      entity, isExist,
    } = FN.buildData(jcamp);

    let currEntity = entity;

    let multiEntities = false;
    let entityFileNames = false;
    if (!isExist) {
      if (!listMuliSpcs || listMuliSpcs.length === 0) return this.renderInvalid();
      const filteredListMuliSpcs = listMuliSpcs.filter(((x) => x !== undefined));
      const filteredListEntityFiles = listEntityFiles.filter(((x) => x !== undefined));
      multiEntities = filteredListMuliSpcs.map((spc) => {
        const {
          entity
        } = FN.buildData(spc.jcamp);
        currEntity = entity;
        return entity;
      });
      entityFileNames = filteredListEntityFiles.map((x) => x.label);
    }

    const others = this.buildOthers();
    const operations = this.buildOpsByLayout(currEntity);
    const descriptions = this.getQDescVal();
    const forecast = {
      btnCb: this.predictOp,
      refreshCb: this.refreshOp,
      molecule: 'molecule',
      predictions,
    };

    return !isExist && multiEntities.length === 0
      ? this.renderInvalid()
      : (
      <SpectraEditor
        entity={currEntity}
        multiEntities={multiEntities}
        entityFileNames={entityFileNames}
        others={others}
        operations={operations}
        forecast={forecast}
        molSvg={sample.svgPath}
        exactMass={sample.molecule_exact_molecular_weight}
        descriptions={descriptions}
        canChangeDescription
        onDescriptionChanged={this.onSpectraDescriptionChanged}
        userManualLink={{ cv: 'https://www.chemotion.net/docs/services/chemspectra/cv' }}
      />
      )
  }

  renderControls(idx) {
    const { spcInfos, arrSpcIdx } = this.state;
    const si = this.getSpcInfo();
    if (!si) return null;
    const options = spcInfos.filter((x) => x.idDt === si.idDt)
      .map((x) => ({ value: x.idx, label: x.label }));
    // const onSelectChange = e => SpectraActions.SelectIdx(e.value);
    const isShowMultiSelect = this.isShowMultipleSelectFile(idx);
    const onSelectChange = (value) => {
      if (Array.isArray(value)) {
        const reversedValue = value.reverse();
        SpectraActions.SelectIdx(reversedValue[0], reversedValue);
      } else {
        SpectraActions.SelectIdx(value, []);
      }
    };
    const dses = this.getDSList();
    const dsOptions = dses.map((x) => ({ value: x.id, label: x.name }));

    const treePopupContainer = createRef();

    return (
      <div className="d-flex align-items-center gap-3 mb-3" ref={treePopupContainer}>
        <Select
          options={dsOptions}
          value={dsOptions.find(({ value }) => value === si.idDt)}
          isClearable={false}
          className="col-sm-2"
          onChange={(e) => this.onDSSelectChange(e)}
          size="sm"
        />
        <TreeSelect
          treeData={options}
          value={isShowMultiSelect ? arrSpcIdx : idx}
          treeCheckable={isShowMultiSelect}
          maxTagCount={1}
          onChange={onSelectChange}
          getPopupContainer={() => treePopupContainer.current}
          className="col-sm-3"
        />
      </div>
    );
  }

  onSpectraDescriptionChanged(value) {
    const { spcInfos, spcIdx } = this.state;
    const sis = spcInfos.filter((x) => x.idx === spcIdx);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];
    const { sample } = this.props;
    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== si.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== si.idAi) return;
        ai.extended_metadata.content.ops = value.ops;
      });
    });
  }

  render() {
    const { showModal } = this.state;
    const si = this.getSpcInfo();
    const modalTitle = si ? `Spectra Editor - ${si.title}` : 'Spectra Editor';

    const {
      jcamp, predictions, idx, listMuliSpcs, listEntityFiles
    } = this.getContent();

    return (
      <AppModal
        title={modalTitle}
        scrollable
        size="xxxl"
        show={showModal}
        animation
        onHide={this.closeOp}
        closeLabel="Close"
        showFooter
      >
        {this.renderControls(idx)}
        {
          showModal && (jcamp || (listMuliSpcs && listMuliSpcs.length > 0))
            ? this.renderSpectraEditor(jcamp, predictions, listMuliSpcs, listEntityFiles)
            : this.renderEmpty()
        }
      </AppModal>
    );
  }
}

ViewSpectra.propTypes = {
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

export default ViewSpectra;
