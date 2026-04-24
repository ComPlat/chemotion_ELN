import base64 from 'base-64';
import { FN } from '@complat/react-spectra-editor';

import alt from 'src/stores/alt/alt';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import {
  decodeSpectra,
  DEFAULT_PREDICTIONS,
} from 'src/apps/mydb/elements/details/spectraCompare/services/spectraDecoder';

const defaultPred = DEFAULT_PREDICTIONS;

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
    this.container = null;

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
    const spcMetas = decodeSpectra(fetchedFiles);
    const sortedSpcInfo = [...spcInfos];
    sortedSpcInfo.sort((a, b) => b.idx - a.idx);
    if (spcMetas.length > 0) {
      const spc = spcMetas[0];
      if (spc.jcamp.layout === FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY) {
        sortedSpcInfo.sort((a, b) => a.label.localeCompare(b.label));
      }
    }
    const sortedSpcIdxs = sortedSpcInfo.map((info) => (info.idx));
    spcMetas.sort((a, b) => {
      return sortedSpcIdxs.indexOf(a.idx) - sortedSpcIdxs.indexOf(b.idx);
    });
    let newArrSpcIdx = [];
    let nextSpcIdx = spcMetas[0]?.idx || 0;
    if (spcMetas.length >= 1) {
      const currentInfo = sortedSpcInfo.find((info) => info.idx === spcMetas[0].idx);
      const currentDatasetId = currentInfo?.idDt;
      const datasetSpcInfos = currentDatasetId
        ? sortedSpcInfo.filter((info) => info.idDt === currentDatasetId)
        : sortedSpcInfo;
      const datasetIdxs = datasetSpcInfos.map((info) => info.idx);
      const datasetSpcMetas = spcMetas.filter((spc) => datasetIdxs.includes(spc.idx));
      const spcInfoWithLabel = datasetSpcInfos.find(
        info => typeof info.label === "string" && info.label.toLowerCase().includes('processed')
      );
      if (spcInfoWithLabel) {
        newArrSpcIdx = [spcInfoWithLabel.idx];
        nextSpcIdx = spcInfoWithLabel.idx;
      } else {
        newArrSpcIdx = datasetSpcMetas.map((spc) => spc.idx);
        nextSpcIdx = datasetSpcMetas[0]?.idx || nextSpcIdx;
      }
    }

    this.setState({
      spcInfos: sortedSpcInfo,
      spcMetas,
      fetched: true,
      spcIdx: nextSpcIdx,
      others: [],
      arrSpcIdx: newArrSpcIdx,
    });
  }

  handleSaveToFile({ fetchedFiles, spcInfo = defaultPred }) {
    const fetchedSpcMetas = decodeSpectra(fetchedFiles);
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
      prevIdx,
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
    const origData = new TextDecoder("utf-8").decode(new Uint8Array([...(base64.decode(rsp.jcamp))].map(ch => ch.charCodeAt(0))));
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

  handleLoadSpectraForNMRDisplayer(payload) {
    if (!payload) {
      this.setState({
        spcInfos: [],
        fetchedSpectra: null,
        fetched: false,
      });
      return;
    }
  
    const { fetchedSpectra, spcInfos } = payload;
  
    this.setState({
      spcInfos: spcInfos || [],
      fetchedSpectra: fetchedSpectra || null,
      fetched: true,
    });
  }

}

export default alt.createStore(SpectraStore, 'SpectraStore');
