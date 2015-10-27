import alt from '../alt';
import ClipboardActions from '../actions/ClipboardActions';
import Aviator from 'aviator';

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

    Aviator.navigate(`/collection/${result.collection_id}/wellplate/template`);
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
