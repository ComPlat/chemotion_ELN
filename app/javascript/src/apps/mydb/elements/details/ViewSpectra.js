/* eslint-disable react/forbid-prop-types */
import React, { createRef } from 'react';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';
import { Alert, Modal, Button } from 'react-bootstrap';
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
  FN.LIST_LAYOUT.LC_MS,
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
    const { spcInfos, spcMetas } = this.state;
    const sis = spcInfos.filter(x => x.idDt === value);
    const availableIdxs = new Set(spcMetas.map((spc) => spc.idx));
    const datasetIdxs = sis.map((info) => info.idx).filter((idx) => availableIdxs.has(idx));
    const nextIdx = datasetIdxs[0] || spcMetas[0]?.idx || 0;
    SpectraActions.SelectIdx(nextIdx, datasetIdxs);
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
      if (layoutsWillShowMulti.includes(jcamp.layout) && jcamp.layout !== FN.LIST_LAYOUT.LC_MS) {
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
      console.log('[Spectra] selected spectra', {
        datasetId: this.getSpcInfo()?.idDt,
        spectrumIds: arrSpcIdx,
        spectrumLabels: listEntityFiles.map((entity) => entity?.label).filter(Boolean),
      });
      return { listMuliSpcs: listMuliSpcs, listEntityFiles: listEntityFiles };
    } else {
      const sm = spcMetas.filter(x => x.idx === spcIdx)[0];
      console.log('[Spectra] selected spectrum', {
        datasetId: this.getSpcInfo()?.idDt,
        spectrumId: spcIdx,
        spectrumLabel: spcInfos.find((info) => info.idx === spcIdx)?.label,
      });
      return sm || spcMetas[0] || { jcamp: null, predictions: null };
    }
  }

  loadEntity(curveIdx = 0) {
    let { jcamp, listMuliSpcs } = this.getContent() || {};

    if (!jcamp && listMuliSpcs && listMuliSpcs.length > 0) {
      jcamp = listMuliSpcs[curveIdx]?.jcamp;
    }

    if (!jcamp) return {};
    const { entity } = FN.buildData(jcamp);
    return entity || {};
  }

  getSpcInfo(curveIdx = 0) {
    const { spcInfos, spcIdx, arrSpcIdx } = this.state;
    let selectedIdx = spcIdx;
    if (arrSpcIdx.length > 0) {
      selectedIdx = arrSpcIdx[curveIdx];
    }

    if (arrSpcIdx.length > 0) {
      const selectedInfo = spcInfos.find((info) => info.idx === selectedIdx) || spcInfos[0];
      const currentDatasetId = selectedInfo?.idDt;
      const uvvisPeakFile = spcInfos.find((info) => (
        info.idDt === currentDatasetId &&
        info.label &&
        info.label.match(/_uvvis\.peak\.jdx$/i)
      ));
      if (uvvisPeakFile && curveIdx === 0) {
        selectedIdx = uvvisPeakFile.idx;
      }
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
    if (!layoutOpsObj) return [];
    const { curveIdx } = curveSt;
    const selectedShift = shift?.shifts?.[curveIdx];
    const selectedIntegration = integration?.integrations?.[curveIdx];
    if (!selectedShift || !selectedIntegration) return [];
  
    const loadEntitySafe = (idx) => {
      let e = this.loadEntity(idx || 0);
      if (e && e.features) return e;
      const content = this.getContent();
      let built = content?.jcamp ? FN.buildData(content.jcamp) : null;
      if (!built) {
        const listMuliSpcs = content?.listMuliSpcs;
        if (Array.isArray(listMuliSpcs) && listMuliSpcs.length) {
          const spc = listMuliSpcs[idx] || listMuliSpcs[0];
          if (spc?.jcamp) built = FN.buildData(spc.jcamp);
        }
      }
      return built?.entity || {};
    };
  
    const entity = loadEntitySafe(curveIdx);
    const features = entity?.features;
    if (!features) return [];
  
    const f0 = Array.isArray(features)
      ? features[0]
      : (features?.editPeak || features?.autoPeak || features) || {};
    const temperature = entity?.temperature;
  
    let observeFrequency = Array.isArray(f0?.observeFrequency)
      ? f0.observeFrequency[0]
      : f0?.observeFrequency;
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
  
    const boundary = (typeof f0.maxY !== 'undefined' && typeof f0.minY !== 'undefined')
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

    let solventDecimal = FN.is13CLayout(layout) ? 2 : decimal;
    const { label, value, name } = selectedShift.ref || {};
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
    const selectedShift = shift?.shifts?.[curveIdx];
    const selectedIntegration = integration?.integrations?.[curveIdx];
    const selectedMultiplicity = multiplicity?.multiplicities?.[curveIdx];
    if (!selectedShift || !selectedIntegration || !selectedMultiplicity) return [];
  
    const loadEntitySafe = (idx) => {
      let e = this.loadEntity(idx || 0);
      if (e && e.features) return e;
      const content = this.getContent();
      let built = content?.jcamp ? FN.buildData(content.jcamp) : null;
      if (!built) {
        const listMuliSpcs = content?.listMuliSpcs;
        if (Array.isArray(listMuliSpcs) && listMuliSpcs.length) {
          const spc = listMuliSpcs[idx] || listMuliSpcs[0];
          if (spc?.jcamp) built = FN.buildData(spc.jcamp);
        }
      }
      return built?.entity || {};
    };

    const entity = loadEntitySafe(curveIdx);
    const features = entity?.features;
    if (!features) return [];
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
    const shiftVal = selectedMultiplicity.shift;
    const ms = selectedMultiplicity.stack || [];
    const is = isStack || [];

    const macs = ms.map((m) => {
      const { peaks, mpyType, xExtent } = m || {};
      const { xL, xU } = xExtent || {};
      const it = is.find((i) => i.xL === xL && i.xU === xU) || { area: 0 };
      const area = refArea ? (it.area * (refFactor || 0)) / refArea : 0;
      const center = FN.calcMpyCenter(peaks || [], shiftVal, mpyType);
      const xs = (peaks || []).map(p => p.x).sort((a, b) => a - b);
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
    const { label, value, name } = selectedShift.ref || {};
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(decimal)} ppm], ` : '';
    return [
      { attributes: { script: 'super' }, insert: layout.slice(0, -1) },
      { insert: `${layout.slice(-1)} NMR (${freqStr}${solvent}ppm) δ = ` },
      ...couplings,
      { insert: '.' },
    ];
  }

  writeCommon({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal, body,
    keepPred, isIntensity, multiplicity, integration, cyclicvoltaSt, curveSt,
    waveLength, axesUnitsSt, detectorSt, dscMetaData, lcms_peaks, lcms_integrals,
    lcms_uvvis_wavelength, lcms_mz_page, lcms_peaks_text,
  }, isMpy = false) {
    const { sample, handleSampleChanged } = this.props;
    const si = this.getSpcInfo();
    if (!si) return;

    let ops = [];
    if (layout === FN.LIST_LAYOUT.LC_MS) {
      const lcmsBody = (lcms_peaks_text || '').trim().replace(/\.\s*$/, '');
      if (lcmsBody) {
        ops = [
          { insert: lcmsBody },
          { insert: '. ' },
        ];
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
    } else if (['1H', '13C', '15N', '19F', '29Si', '31P'].includes(layout) && isMpy) {
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

    const cb = () => (
      this.saveOp({
        peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity, cyclicvoltaSt, curveSt, layout, waveLength, axesUnitsSt, detectorSt, dscMetaData, lcms_peaks, lcms_integrals,
        lcms_uvvis_wavelength, lcms_mz_page,
      })
    );
    handleSampleChanged(sample, cb);
  }

  notationVoltammetry(cyclicvoltaSt, curveSt, layout, sample, idDt) {
    const { spectraList } = cyclicvoltaSt;
    const { curveIdx, listCurves } = curveSt;
    const selectedVolta = spectraList[curveIdx];
    const selectedCurve = listCurves[curveIdx];
    const { feature } = selectedCurve;
    const { scanRate } = feature;
    const metadata = InlineMetadata(sample?.datasetContainers(), idDt);
    const data = {
      scanRate,
      voltaData: {
        listPeaks: selectedVolta.list,
        xyData: feature.data[0],
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

  saveOp({
    peaks, shift, scan, thres, analysis, keepPred,
    integration, multiplicity, waveLength, cyclicvoltaSt,
    curveSt, simulatenmr = false, layout, axesUnitsSt,
    detectorSt, dscMetaData, lcms_peaks, lcms_integrals,
    lcms_uvvis_wavelength, lcms_mz_page,
  }) {
    const { handleSubmit } = this.props;
    const { curveIdx } = curveSt;
    const si = this.getSpcInfo(curveIdx);
    if (!si) return;

    let peaksStr = '';
    if (lcms_peaks && layout === FN.LIST_LAYOUT.LC_MS) {
      const dict = {};
      lcms_peaks.forEach((p) => {
        const key = String(p.wavelength);
        if (!dict[key]) dict[key] = [];
        dict[key].push({ x: p.x, y: p.y });
      });
      peaksStr = JSON.stringify(dict);
    } else {
      const fPeaks = FN.rmRef(peaks, shift);
      peaksStr = FN.toPeakStr(fPeaks);
    }

    const { integrations } = integration;
    const selectedIntegration = integrations[curveIdx];
    let integrationPayload = JSON.stringify(selectedIntegration);

    if (lcms_integrals && layout === FN.LIST_LAYOUT.LC_MS) {
      const dict = {};
      lcms_integrals.forEach((i) => {
        const key = String(i.wavelength);
        if (!dict[key]) dict[key] = [];
        dict[key].push([i.from, i.to, i.value, i.integral]);
      });
      integrationPayload = JSON.stringify(dict);
    }

    const fPeaks = FN.rmRef(peaks, shift);
    const predict = JSON.stringify(rmRefreshed(analysis));
    const waveLengthStr = JSON.stringify(waveLength);
    const cyclicvolta = JSON.stringify(cyclicvoltaSt);
    const axesUnitsStr = JSON.stringify(axesUnitsSt);
    const detector = JSON.stringify(detectorSt);
    const lcms_peaksStr = JSON.stringify(lcms_peaks);
    const lcms_integralsStr = JSON.stringify(lcms_integrals);

    const { shifts } = shift;
    const selectedShift = shifts[curveIdx];
    const { multiplicities } = multiplicity;
    const selectedMultiplicity = multiplicities[curveIdx];

    const isSaveCombined = FN.isCyclicVoltaLayout(layout);
    const { spcInfos, arrSpcIdx } = this.state;
    const previousSpcInfos = spcInfos.filter((spc) => (spc.idDt === si.idDt && arrSpcIdx.includes(spc.idx)));
    LoadingActions.start.defer();
    SpectraActions.SaveToFile.defer(
      si,
      peaksStr,
      selectedShift,
      scan,
      thres,
      integrationPayload,
      JSON.stringify(selectedMultiplicity),
      predict,
      handleSubmit,
      keepPred,
      waveLengthStr,
      cyclicvolta,
      curveIdx,
      simulatenmr,
      previousSpcInfos,
      isSaveCombined,
      axesUnitsStr,
      detector,
      JSON.stringify(dscMetaData),
      lcms_peaksStr,
      lcms_integralsStr,
      lcms_uvvis_wavelength,
      lcms_mz_page,
    );
  }

  refreshOp({
    peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt, lcms_peaks, lcms_integrals,
    lcms_uvvis_wavelength, lcms_mz_page,
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, simulatenmr: true, layout, axesUnitsSt, detectorSt, lcms_peaks, lcms_integrals,
      lcms_uvvis_wavelength, lcms_mz_page,
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

  saveCloseOp({
    peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt, dscMetaData, lcms_peaks, lcms_integrals,
    lcms_uvvis_wavelength, lcms_mz_page,
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt, dscMetaData, lcms_peaks, lcms_integrals,
      lcms_uvvis_wavelength, lcms_mz_page,
    });
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
      } else if (FN.isLCMsLayout(et.layout)) {
        return [
          { name: 'save', value: this.saveOp },
          { name: 'save & close', value: this.saveCloseOp },
          { name: 'write peak & save', value: this.writePeakOp },
          { name: 'write peak, save & close', value: this.writeClosePeakOp },
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
    const spcInfo = this.getSpcInfo();
    const datasetKey = spcInfo?.idDt ?? 'unknown';
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
        key={`dataset-${datasetKey}`}
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

  renderTitle(idx) {
    const { spcInfos, arrSpcIdx, spcMetas } = this.state;
    const si = this.getSpcInfo();
    if (!si) return null;
    const modalTitle = si ? `Spectra Editor - ${si.title}` : '';
    const currentSpc = spcMetas.find((x) => x.idx === idx) || spcMetas[0];
    const isLcmsLayout = currentSpc?.jcamp?.layout === FN.LIST_LAYOUT.LC_MS;
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
    console.log('[Spectra] dataset select state', {
      currentDatasetId: si.idDt,
      selectedSpectrumIds: arrSpcIdx.length > 0 ? arrSpcIdx : [idx],
    });

    const treePopupContainer = createRef();

    return (
      <Modal.Header className="justify-content-between align-items-baseline">
        <span className="fs-3">
          {modalTitle}
        </span>
        <div className="d-flex gap-1 align-items-center" ref={treePopupContainer}>
          <Select
            options={dsOptions}
            value={dsOptions.find(({value}) => value === si.idDt)}
            isClearable={false}
            styles={{
              container: (baseStyles, state) => ({
                ...baseStyles,
                width: 200,
              })
            }}
            onChange={(e) => this.onDSSelectChange(e)}
          />
          <TreeSelect
            treeData={options}
            value={isShowMultiSelect ? arrSpcIdx : idx}
            treeCheckable={isShowMultiSelect}
            disabled={isLcmsLayout}
            style={{ width: 500 }}
            maxTagCount={1}
            onChange={onSelectChange}
            getPopupContainer={() => treePopupContainer.current}
          />
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={this.closeOp}
        >
          <i className="fa fa-times me-1" />
          Close without Save
        </Button>
      </Modal.Header>
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

    const {
      jcamp, predictions, idx, listMuliSpcs, listEntityFiles
    } = this.getContent();

    return (
      <Modal
        centered
        scrollable
        size="xxxl"
        show={showModal}
        animation
        onHide={this.closeOp}
      >
        {this.renderTitle(idx)}
        <Modal.Body className="min-vh-80">
          {
            showModal && (jcamp || (listMuliSpcs && listMuliSpcs.length > 0))
              ? this.renderSpectraEditor(jcamp, predictions, listMuliSpcs, listEntityFiles)
              : this.renderEmpty()
          }
        </Modal.Body>
      </Modal>
    );
  }
}

ViewSpectra.propTypes = {
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

export default ViewSpectra;
