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
  FN.LIST_LAYOUT.AIF
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
    if (arrSpcIdx.length > 0) {
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

    const { jcamp } = this.getContent();
    const { entity } = FN.buildData(jcamp);
    const { features } = entity;
    const { temperature } = entity;
    const { observeFrequency } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
    // peaks
    const { maxY, minY } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const boundary = { maxY, minY };
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
    // if (!selectedShift || !selectedIntegration) {
    //   return []
    // }

    // obsv freq
    const { jcamp } = this.getContent();
    const { entity } = FN.buildData(jcamp);
    const { features } = entity;
    const { observeFrequency } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
    // multiplicity
    const { refArea, refFactor } = selectedIntegration;
    const shiftVal = selectedMutiplicity.shift;
    const ms = selectedMutiplicity.stack;
    const is = selectedIntegration.stack;

    const macs = ms.map((m) => {
      const { peaks, mpyType, xExtent } = m;
      const { xL, xU } = xExtent;
      const it = is.filter((i) => i.xL === xL && i.xU === xU)[0] || { area: 0 };
      const area = (it.area * refFactor) / refArea;
      const center = FN.calcMpyCenter(peaks, shiftVal, mpyType);
      const xs = m.peaks.map(p => p.x).sort((a, b) => a - b);
      const [aIdx, bIdx] = isAscend ? [0, xs.length - 1] : [xs.length - 1, 0];
      const mxA = mpyType === 'm' ? (xs[aIdx] - shiftVal).toFixed(decimal) : 0;
      const mxB = mpyType === 'm' ? (xs[bIdx] - shiftVal).toFixed(decimal) : 0;
      return Object.assign({}, m, {
        area, center, mxA, mxB,
      });
    }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));
    let couplings = [].concat(...macs.map((m) => {
      m.js.sort((a, b) => (isAscend ? a - b : b - a));
      const c = m.center;
      const type = m.mpyType;
      const it = Math.round(m.area);
      const js = [].concat(...m.js.map(j => (
        [
          { insert: 'J', attributes: { italic: true } },
          { insert: ` = ${j.toFixed(1)} Hz` },
          { insert: ', ' },
        ]
      )));
      const atomCount = layout === '1H' ? `, ${it}H` : '';
      const location = type === 'm' ? `${m.mxA}–${m.mxB}` : `${c.toFixed(decimal)}`;
      return m.js.length === 0
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

  writeCommon({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal, body,
    keepPred, isIntensity, multiplicity, integration, cyclicvoltaSt, curveSt,
    waveLength, axesUnitsSt, detectorSt, dscMetaData,
  }, isMpy = false) {
    const { sample, handleSampleChanged } = this.props;
    const si = this.getSpcInfo();
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

    const cb = () => (
      this.saveOp({
        peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity, cyclicvoltaSt, curveSt, layout, waveLength, axesUnitsSt, detectorSt, dscMetaData,
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
    peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, simulatenmr = false, layout, axesUnitsSt, detectorSt, dscMetaData,
  }) {
    const { handleSubmit } = this.props;
    const { curveIdx } = curveSt;
    const si = this.getSpcInfo(curveIdx);
    if (!si) return;
    const fPeaks = FN.rmRef(peaks, shift);
    const peaksStr = FN.toPeakStr(fPeaks);
    const predict = JSON.stringify(rmRefreshed(analysis));
    const waveLengthStr = JSON.stringify(waveLength);
    const cyclicvolta = JSON.stringify(cyclicvoltaSt);
    const axesUnitsStr = JSON.stringify(axesUnitsSt);
    const detector = JSON.stringify(detectorSt);

    const { shifts } = shift;
    const selectedShift = shifts[curveIdx];
    const { integrations } = integration;
    const selectedIntegration = integrations[curveIdx];
    const { multiplicities } = multiplicity;
    const selectedMutiplicity = multiplicities[curveIdx];

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
      JSON.stringify(selectedIntegration),
      JSON.stringify(selectedMutiplicity),
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
    );
  }

  refreshOp({
    peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, simulatenmr: true, layout, axesUnitsSt, detectorSt
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
    peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt, dscMetaData,
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis, integration, multiplicity, waveLength, cyclicvoltaSt, curveSt, layout, axesUnitsSt, detectorSt, dscMetaData,
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
    if (this.props.sample && this.props.sample instanceof ResearchPlan) {
      return [
        { name: 'write & save', value: this.saveOp },
        { name: 'write, save & close', value: this.saveCloseOp },
      ];
    }
    const updatable = this.props.sample && this.props.sample.can_update;
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
        return [
          { name: 'save', value: this.writeCommon },
          { name: 'save & close', value: this.writeCloseCommon },
        ];
      } else {
        return [
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
      listMuliSpcs = listMuliSpcs.filter(((x) => x !== undefined));
      listEntityFiles = listEntityFiles.filter(((x) => x !== undefined));
      multiEntities = listMuliSpcs.map((spc) => {
        const {
          entity
        } = FN.buildData(spc.jcamp);
        currEntity = entity;
        return entity;
      });
      entityFileNames = listEntityFiles.map((x) => x.label);
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
      : <SpectraEditor
        entity={currEntity}
        multiEntities={multiEntities}
        entityFileNames={entityFileNames}
        others={others}
        operations={operations}
        forecast={forecast}
        molSvg={sample.svgPath}
        theoryMass={sample.molecule_molecular_weight}
        descriptions={descriptions}
        canChangeDescription
        onDescriptionChanged={this.onSpectraDescriptionChanged}
        userManualLink={{ cv: 'https://www.chemotion.net/docs/services/chemspectra/cv' }}
      />
  }

  renderTitle(idx) {
    const { spcInfos, arrSpcIdx } = this.state;
    const si = this.getSpcInfo();
    if (!si) return null;
    const modalTitle = si ? `Spectra Editor - ${si.title}` : '';
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
        size="xxxl"
        show={showModal}
        animation
        onHide={this.closeOp}
      >
        {this.renderTitle(idx)}
        <Modal.Body className="vh-80">
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
