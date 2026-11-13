import alt from 'src/stores/alt/alt';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';

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
    });
  }

  handleFetchSamplesByUIStateAndLimit(result) {
    this.state.samples = result.samples;

    switch (result.action) {
      case 'template_wellplate':
        aviatorNavigationWithCollectionId(result.collection_id, 'wellplate', 'template', false, true);
        break;
      case 'copy_sample':
        aviatorNavigationWithCollectionId(result.collection_id, 'sample', 'copy', false, true);
    }
  }

  handleFetchWellplatesByUIState(result) {
    this.state.wellplates = result.wellplates;
    switch (result.action) {
      case 'template_screen':
        aviatorNavigationWithCollectionId(result.collection_id, 'screen', 'template', false, true);
    }
  }

  handleFetchDeviceDescriptionAndBuildCopy(result) {
    this.state.device_descriptions = result.device_descriptions;
    aviatorNavigationWithCollectionId(result.collection_id, 'device_description', 'copy', false, true);
  }

  handleFetchSequenceBasedMacromoleculeSamplesAndBuildCopy(result) {
    this.state.sequence_based_macromolecule_samples = result.sequence_based_macromolecule_samples;
    aviatorNavigationWithCollectionId(result.collection_id, 'sequence_based_macromolecule_sample', 'copy', false, true);
  }
}

export default alt.createStore(ClipboardStore, 'ClipboardStore');
