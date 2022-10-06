import alt from 'src/stores/alt/alt';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import Aviator from 'aviator';

class ClipboardStore {
  constructor() {
    this.state = {
      samples: [],
      wellplates: []
    };

    this.bindListeners({
      handleFetchSamplesByUIStateAndLimit: [ClipboardActions.fetchSamplesByUIStateAndLimit, ClipboardActions.fetchElementAndBuildCopy],
      handleFetchWellplatesByUIState: ClipboardActions.fetchWellplatesByUIState
    })
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;

    switch(result.action) {
      case 'template_wellplate':
        Aviator.navigate(result.isShared
          ? `/scollection/${result.collection_id}/wellplate/template`
          : `/collection/${result.collection_id}/wellplate/template`);
        break;
      case 'copy_sample':
        Aviator.navigate(result.isShared
          ? `/scollection/${result.collection_id}/sample/copy`
          : `/collection/${result.collection_id}/sample/copy`);
    }
  }

  handleFetchWellplatesByUIState(result) {
    this.state.wellplates = result.wellplates;
    switch(result.action) {
      case 'template_screen':
        Aviator.navigate(result.isShared
          ? `/scollection/${result.collection_id}/screen/template`
          : `/collection/${result.collection_id}/screen/template`);
    }
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
