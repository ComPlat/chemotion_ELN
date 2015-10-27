import alt from '../alt';
import ClipboardActions from '../actions/ClipboardActions';

class ClipboardStore {
  constructor() {
    this.state = {
      samples: []
    };

    this.bindListeners({
      handleFetchSamplesByUIStateAndLimit: ClipboardActions.fetchSamplesByUIStateAndLimit
    })
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
