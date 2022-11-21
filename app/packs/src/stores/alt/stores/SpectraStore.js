import base64 from 'base-64';
import { FN } from '@complat/react-spectra-editor';

import alt from 'src/stores/alt/alt';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';

const defaultPred = {
  outline: {},
  output: { result: [] },
};

class SpectraStore {
  constructor() {
    this.spcMetas = [];
    this.spcInfos = [];
    this.spcIdx = 0;
    this.arrSpcIdx = [];
    this.showModal = false;
    this.fetched = false;
    this.writing = false;
    this.others = [];
    this.showModalNMRDisplayer = false;
    this.showCompareModal = false;
    this.spectraCompare = [];

    this.bindListeners({
      handleToggleModal: SpectraActions.ToggleModal,
      handleToggleCompareModal: SpectraActions.ToggleCompareModal,
      handleLoadSpectra: SpectraActions.LoadSpectra,
      handleSaveToFile: SpectraActions.SaveToFile,
      handleRegenerate: SpectraActions.Regenerate,
      handleInferSpectrum: SpectraActions.InferSpectrum,
      handleInferRunning: SpectraActions.InferRunning,
      handleWriteStart: SpectraActions.WriteStart,
      handleWriteStop: SpectraActions.WriteStop,
      handleSelectIdx: SpectraActions.SelectIdx,
      handleAddOthers: SpectraActions.AddOthers,
      handleRegenerateEdited: SpectraActions.RegenerateEdited,
      handleToggleModalNMRDisplayer: SpectraActions.ToggleModalNMRDisplayer,
      handleLoadSpectraForNMRDisplayer: SpectraActions.LoadSpectraForNMRDisplayer,
      handleLoadSpectraCompare: SpectraActions.LoadSpectraCompare,
    });
  }

  decodeSpectrum(target) { // eslint-disable-line class-methods-use-this
    const { file, predictions, id } = target;
    if (!file) return null;
    let spectrum = { predictions: defaultPred, idx: id };
    if (predictions && predictions.outline && predictions.outline.code) {
      spectrum = Object.assign({}, spectrum, { predictions });
    }

    try {
      const raw = base64.decode(file);
      const jcamp = FN.ExtractJcamp(raw);
      if (!jcamp.spectra) return null;
      spectrum = Object.assign({}, spectrum, { jcamp });
    } catch (err) {
      console.log('stores/SpectraStore.js: decodeSpectrum error!');
      return null;
    }

    return spectrum; // spectrum = { predictions: {…}, jcamp: {…} }
  }

  decodeSpectra(fetchedFiles = {}) {
    const { files } = fetchedFiles;
    if (!files) return [];
    const returnFiles = files.map(f => this.decodeSpectrum(f)).filter(r => r !== null);
    if (returnFiles === null || returnFiles === undefined) {
      return [];
    }
    return returnFiles.sort(function(a, b) {
      return b.idx - a.idx;
    });
  }

  handleToggleModal() {
    this.setState({
      spcMetas: [],
      spcInfos: [],
      showModal: !this.showModal,
      fetched: false,
      others: [],
    });
  }

  handleToggleCompareModal(container) {
    this.setState({
      showCompareModal: !this.showCompareModal,
      container: container,
    })
  }

  handleLoadSpectra({ fetchedFiles, spcInfos }) {
    const spcMetas = this.decodeSpectra(fetchedFiles);
    let newArrSpcIdx = spcMetas.map(spci => (
      spci.idx
    )).filter(r => r !== null);
    if (newArrSpcIdx.length <= 1) {
      newArrSpcIdx = [];
    }
    this.setState({
      spcInfos,
      spcMetas,
      fetched: true,
      spcIdx: (spcMetas[0].idx || 0),
      others: [],
      arrSpcIdx: newArrSpcIdx,
    });
  }

  handleLoadSpectraCompare({ fetchedFiles, spcInfos }) {
    const spcMetas = this.decodeSpectra(fetchedFiles);
    this.setState({
      spectraCompare: spcMetas,
      fetched: true,
    });
  }

  handleSaveToFile({ fetchedFiles, spcInfo = defaultPred }) {
    const fetchedSpcMetas = this.decodeSpectra(fetchedFiles);
    const fsm = fetchedSpcMetas.length > 0 ? fetchedSpcMetas[0] : null;
    if (!fsm) return;
    const fetchedIdx = fsm.idx;
    const prevIdx = spcInfo.idx;
    const fsi = Object.assign({}, spcInfo, { idx: fetchedIdx }); //  shortcut
    const { spcInfos, spcMetas, arrSpcIdx } = this;
    const newSpcInfos = spcInfos.map(si => (
      si.idx === prevIdx ? fsi : si
    )).filter(r => r !== null);
    const newSpcMetas = spcMetas.map(sm => (
      sm.idx === prevIdx ? fsm : sm
    )).filter(r => r !== null);
    const newArrSpcIdx = arrSpcIdx.map(spci => (
      spci === prevIdx ? fetchedIdx : spci
    )).filter(r => r !== null);
    this.setState({
      spcInfos: newSpcInfos,
      spcMetas: newSpcMetas,
      fetched: true,
      spcIdx: fetchedIdx,
      others: [],
      arrSpcIdx: newArrSpcIdx,
    });
  }

  handleRegenerate() {
    // no further process needed.
  }

  handleRegenerateEdited() {
    // no further process needed.
  }

  handleWriteStart(payload) {
    this.replacePredictions(defaultPred);
    this.setState({
      writing: payload,
      others: [],
    });
  }

  handleWriteStop() {
    this.setState({
      writing: false,
      others: [],
    });
  }

  handleInferRunning() {
    const targetPreds = Object.assign({}, defaultPred, { running: true });
    this.replacePredictions(targetPreds);
  }

  handleInferSpectrum(props) {
    this.handleSaveToFile(props);
    const preds = props.fetchedFiles.predict || defaultPred;
    const targetPreds = Object.assign({}, preds, { refreshed: true });
    this.replacePredictions(targetPreds);
  }

  handleSelectIdx(payload) {
    const { spcIdx, arrSpcIdx } = payload;
    this.setState({ spcIdx, arrSpcIdx, others: [] });
  }

  replacePredictions(predictions) {
    const { spcIdx } = this;
    const spcMetas = this.spcMetas.map(x => (
      x.idx === spcIdx
        ? Object.assign({}, x, { predictions })
        : x
    ));
    this.setState({ spcMetas, others: [] });
  }

  handleAddOthers(rsp) {
    const origData = base64.decode(rsp.jcamp);
    const jcampData = FN.ExtractJcamp(origData);
    this.setState({ others: [jcampData] });
  }

  handleToggleModalNMRDisplayer() {
    this.setState({
      spcMetas: [],
      spcInfos: [],
      showModalNMRDisplayer: !this.showModalNMRDisplayer,
      fetched: false,
      others: [],
    })
  }

  handleLoadSpectraForNMRDisplayer({ fetchedFiles, spcInfos }) {
    this.setState({
      spcInfos,
      fetchedFiles,
      fetched: true,
    });
  }

  
}

export default alt.createStore(SpectraStore, 'SpectraStore');
