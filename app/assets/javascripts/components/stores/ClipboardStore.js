import alt from '../alt';
import ClipboardActions from '../actions/ClipboardActions';
import Aviator from 'aviator';

class ClipboardStore {
  constructor() {
    this.state = {
      samples: [],
      wellplates: []
    };

    this.bindListeners({
      handleFetchSamplesByUIStateAndLimit: ClipboardActions.fetchSamplesByUIStateAndLimit,
      handleFetchWellplatesByUIState: ClipboardActions.fetchWellplatesByUIState
    })
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;

    switch(result.action) {
      case 'template_wellplate':
        Aviator.navigate(`/collection/${result.collection_id}/wellplate/template`);
        break;
    }
  }

  handleFetchWellplatesByUIState(result) {
    this.state.wellplates = result.wellplates;
    switch(result.action) {
      case 'template_screen':
        Aviator.navigate(`/collection/${result.collection_id}/screen/template`);
    }
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
