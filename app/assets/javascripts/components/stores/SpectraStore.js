import base64 from 'base-64';
import { ExtractJcamp } from 'react-spectra-viewer';

import alt from '../alt';
import SpectraActions from '../actions/SpectraActions';

class SpectraStore {
  constructor() {
    this.options = [];
    this.allSpectra = [];
    this.selectedOpt = null;
    this.showModal = false;
    this.fetched = false;

    this.bindListeners({
      handleInitOpts: SpectraActions.InitOpts,
      handleSelect: SpectraActions.Select,
      handleToggleModal: SpectraActions.ToggleModal,
      handleLoadSpectra: SpectraActions.LoadSpectra,
    });
  }

  handleInitOpts({ options }) {
    const selectedOpt = options[0];
    this.setState({
      options,
      selectedOpt,
      fetched: false,
      allSpectra: [],
    });
  }

  buildAllSpectra(result) {
    const { files } = result;
    if (!files) return [];
    const decodedFiles = files.map((f) => {
      try {
        const raw = base64.decode(f.file);
        const file = ExtractJcamp(raw);
        if (!file.spectrum) return null;
        return Object.assign({}, f, { file });
      } catch (err) {
        return null;
      }
    }).filter(r => r != null);
    return decodedFiles;
  }

  handleSelect(selectedOpt) {
    this.setState({ selectedOpt });
  }

  handleToggleModal() {
    this.setState({
      showModal: !this.showModal,
      fetched: false,
      allSpectra: [],
    });
  }

  handleLoadSpectra(result) {
    const selectedOpt = this.options[0];
    const allSpectra = this.buildAllSpectra(result);
    this.setState({ selectedOpt, allSpectra, fetched: true });
  }
}

export default alt.createStore(SpectraStore, 'SpectraStore');
