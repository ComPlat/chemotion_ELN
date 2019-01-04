import base64 from 'base-64';
import { ExtractJcamp } from 'react-spectra-viewer';

import alt from '../alt';
import SpectraActions from '../actions/SpectraActions';

class SpectraStore {
  constructor() {
    this.jcamp = null;
    this.spcInfo = null;
    this.showModal = false;
    this.fetched = false;

    this.bindListeners({
      handleToggleModal: SpectraActions.ToggleModal,
      handleLoadSpectra: SpectraActions.LoadSpectra,
    });
  }

  buildSpectrum(result) {
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
    if (!decodedFiles) return [];
    return decodedFiles[0];
  }

  handleToggleModal() {
    this.setState({
      jcamp: null,
      spcInfo: null,
      showModal: !this.showModal,
      fetched: false,
    });
  }

  handleLoadSpectra({ rawJcamp, spcInfo }) {
    const jcamp = this.buildSpectrum(rawJcamp);
    this.setState({ spcInfo, jcamp, fetched: true });
  }
}

export default alt.createStore(SpectraStore, 'SpectraStore');
