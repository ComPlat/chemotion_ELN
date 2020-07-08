import base64 from 'base-64';
import { FN } from 'react-spectra-editor';

import alt from '../alt';
import SpectraActions from '../actions/SpectraActions';

const defaultPred = {
  outline: {},
  output: { result: [] },
};

class SpectraStore {
  constructor() {
    this.spcMetas = [];
    this.spcInfos = [];
    this.spcIdx = 0;
    this.showModal = false;
    this.fetched = false;
    this.writing = false;

    this.bindListeners({
      handleToggleModal: SpectraActions.ToggleModal,
      handleLoadSpectra: SpectraActions.LoadSpectra,
      handleSaveToFile: SpectraActions.SaveToFile,
      handleRegenerate: SpectraActions.Regenerate,
      handleInferSpectrum: SpectraActions.InferSpectrum,
      handleInferRunning: SpectraActions.InferRunning,
      handleWriteStart: SpectraActions.WriteStart,
      handleWriteStop: SpectraActions.WriteStop,
      handleSelectIdx: SpectraActions.SelectIdx,
    });
  }

  decodeSpectrum(target) { // eslint-disable-line class-methods-use-this
    const { file, predictions, id } = target;
    if (!file) return null;
    let spectrum = { predictions: defaultPred, idx: id };
    if (predictions.outline && predictions.outline.code) {
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
    return files.map(f => this.decodeSpectrum(f)).filter(r => r !== null);
  }

  handleToggleModal() {
    this.setState({
      spcMetas: [],
      spcInfos: [],
      showModal: !this.showModal,
      fetched: false,
    });
  }

  handleLoadSpectra({ fetchedFiles, spcInfos }) {
    const spcMetas = this.decodeSpectra(fetchedFiles);
    this.setState({
      spcInfos, spcMetas, fetched: true, spcIdx: (spcMetas[0].idx || 0),
    });
  }

  handleSaveToFile({ fetchedFiles, spcInfo = defaultPred }) {
    const fetchedSpcMetas = this.decodeSpectra(fetchedFiles);
    const fsm = fetchedSpcMetas.length > 0 ? fetchedSpcMetas[0] : null;
    if (!fsm) return;
    const fetchedIdx = fsm.idx;
    const prevIdx = spcInfo.idx;
    const fsi = Object.assign({}, spcInfo, { idx: fetchedIdx }); //  shortcut
    const { spcInfos, spcMetas } = this;
    const newSpcInfos = spcInfos.map(si => (
      si.idx === prevIdx ? fsi : si
    )).filter(r => r !== null);
    const newSpcMetas = spcMetas.map(sm => (
      sm.idx === prevIdx ? fsm : sm
    )).filter(r => r !== null);
    this.setState({
      spcInfos: newSpcInfos,
      spcMetas: newSpcMetas,
      fetched: true,
      spcIdx: fetchedIdx,
    });
  }

  handleRegenerate() {
    // no further process needed.
  }

  handleWriteStart(payload) {
    this.replacePredictions(defaultPred);
    this.setState({
      writing: payload,
    });
  }

  handleWriteStop() {
    this.setState({ writing: false });
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

  handleSelectIdx(spcIdx) {
    this.setState({ spcIdx });
  }

  replacePredictions(predictions) {
    const { spcIdx } = this;
    const spcMetas = this.spcMetas.map(x => (
      x.idx === spcIdx
        ? Object.assign({}, x, { predictions })
        : x
    ));
    this.setState({ spcMetas });
  }
}

export default alt.createStore(SpectraStore, 'SpectraStore');
