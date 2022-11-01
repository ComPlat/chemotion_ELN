import alt from 'src/stores/alt/alt';
import NmrSimActions from 'src/stores/alt/actions/NmrSimActions';

import Jcampconverter from 'jcampconverter';

class NmrSimStore {
  constructor() {
    this.state = {
      currentNmr: { data13C: [], data1H: [] },
      currentType: '13C',
      synced: false,
    };

    this.bindListeners({
      handleUpdateNmrdb: NmrSimActions.updateNmrdb,
      handleResetNMR: NmrSimActions.resetNMR,
    });
  }

  handleUpdateNmrdb({ type, spectrum }) {
    this.state.currentType = type;
    this.state.synced = true;
    if (spectrum) {
      if (spectrum.response_1h) {
        const data1h = this.decodeNmrdb1H(JSON.parse(spectrum.response_1h));
        this.assignNmrdb(data1h, '1H');
      }
      if (spectrum.response_13c) {
        const data13C = this.decodeNmrdb13C(JSON.parse(spectrum.response_13c));
        this.assignNmrdb(data13C, '13C');
      }
    }
  }

  decodeNmrdb13C(response) {
    const jcamp = response.result.spectrum13C.jcamp.value;
    return Jcampconverter.convert(jcamp, { xy: true }).spectra[0].data[0];
  }

  decodeNmrdb1H(response) {
    const jcamp = response.jcamp.value;
    return Jcampconverter.convert(jcamp, { xy: true }).spectra[0].data[0];
  }

  assignNmrdb(spectrum, type) {
    const data = [];
    for (let i = 0; i < spectrum.y.length; i++) {
      data.push({ x: spectrum.x[i], y: spectrum.y[i] });
    }
    if (type === '13C') {
      this.state.currentNmr.data13C = data;
    } else {
      this.state.currentNmr.data1H = data;
    }
  }

  handleResetNMR() {
    this.state.currentNmr = { data13C: [], data1H: [] };
    this.state.synced = false;
  }
}

export default alt.createStore(NmrSimStore, 'NmrSimStore');
