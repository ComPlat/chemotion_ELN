import alt from 'src/stores/alt/alt';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import Aviator from 'aviator';

class ClipboardStore {
  constructor() {
    this.state = {
      samples: [],
      wellplates: [],
      device_descriptions: [],
      sequence_based_macromolecules_samples: [],
    };

    this.bindListeners({
      handleFetchSamplesByUIStateAndLimit: [
        ClipboardActions.fetchSamplesByUIStateAndLimit, ClipboardActions.fetchElementAndBuildCopy
      ],
      handleFetchWellplatesByUIState: ClipboardActions.fetchWellplatesByUIState,
      handleFetchDeviceDescriptionAndBuildCopy: [
        ClipboardActions.fetchDeviceDescriptionAndBuildCopy, ClipboardActions.fetchDeviceDescriptionsByUIState
      ],
      handleFetchSequenceBasedMacromoleculeSamplesAndBuildCopy: [
        ClipboardActions.fetchSequenceBasedMacromoleculeSamplesAndBuildCopy,
        ClipboardActions.fetchSequenceBasedMacromoleculeSamplesByUIState
      ],
    })
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;

    switch (result.action) {
      case 'template_wellplate':
        Aviator.navigate(result.isSync
          ? `/scollection/${result.collection_id}/wellplate/template`
          : `/collection/${result.collection_id}/wellplate/template`);
        break;
      case 'copy_sample':
        Aviator.navigate(result.isSync
          ? `/scollection/${result.collection_id}/sample/copy`
          : `/collection/${result.collection_id}/sample/copy`);
    }
  }

  handleFetchWellplatesByUIState(result) {
    this.state.wellplates = result.wellplates;
    switch (result.action) {
      case 'template_screen':
        Aviator.navigate(result.isSync
          ? `/scollection/${result.collection_id}/screen/template`
          : `/collection/${result.collection_id}/screen/template`);
    }
  }

  handleFetchDeviceDescriptionAndBuildCopy(result) {
    this.state.device_descriptions = result.device_descriptions;
    Aviator.navigate(result.isSync
      ? `/scollection/${result.collection_id}/device_description/copy`
      : `/collection/${result.collection_id}/device_description/copy`);
  }

  handleFetchSequenceBasedMacromoleculeSamplesAndBuildCopy(result) {
    this.state.sequence_based_macromolecule_samples = result.sequence_based_macromolecule_samples;
    Aviator.navigate(result.isSync
      ? `/scollection/${result.collection_id}/sequence_based_macromolecule_sample/copy`
      : `/collection/${result.collection_id}/sequence_based_macromolecule_sample/copy`);
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
