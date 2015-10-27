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

    switch(result.action) {
      case 'template_wellplate':
        Aviator.navigate(`/collection/${result.collection_id}/wellplate/template`);
        break;
      case 'copy_sample':
        Aviator.navigate(`/collection/${result.collection_id}/sample/copy`);
    }
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
