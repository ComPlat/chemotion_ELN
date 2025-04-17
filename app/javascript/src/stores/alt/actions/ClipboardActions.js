import alt from 'src/stores/alt/alt';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import DeviceDescription from 'src/models/DeviceDescription';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import SequenceBasedMacromoleculeSamplesFetcher from 'src/fetchers/SequenceBasedMacromoleculeSamplesFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

/**
 * Fetches components for a sample (if mixture) and adds them to the sample instance.
 * @async
 * @param {Object|Sample} sample - The sample object or instance.
 * @returns {Promise<Sample>} The sample instance with components (if mixture).
 */
async function fetchAndAddComponents(sample) {
  const sampleInstance = sample instanceof Sample ? sample : new Sample({ ...sample });

  if (!sampleInstance.isMixture()) return sampleInstance;

  try {
    const components = await ComponentsFetcher.fetchComponentsBySampleId(sampleInstance.id);
    const parsedComponents = components.map(Component.deserializeData);
    await sampleInstance.initialComponents(parsedComponents);
  } catch (e) {
    console.warn('Failed to fetch components for mixture sample', sampleInstance.id, e);
  }

  return sampleInstance;
}

/**
 * ClipboardActions provides methods to fetch and copy samples, wellplates, and device descriptions.
 * Used for clipboard and UI state management in Chemotion.
 */
class ClipboardActions {
  /**
   * Fetches samples by UI state and limit, processes their components, and dispatches the result.
   * @param {Object} params - Parameters for fetching samples (must include sample.collection_id).
   * @param {string} action - The action type for dispatch.
   * @returns {Function} Thunk for dispatching the result.
   */
  fetchSamplesByUIStateAndLimit(params, action) {
    return (dispatch) => {
      SamplesFetcher.fetchSamplesByUIStateAndLimit(params)
        .then(async (result) => {
          const processedSamples = await Promise.all(
            (Array.isArray(result) ? result : []).map(fetchAndAddComponents)
          );

          dispatch({
            samples: processedSamples,
            collection_id: params.sample.collection_id,
            action,
          });
        })
        .catch((errorMessage) => {
          console.error('Failed to fetch samples:', errorMessage);
        });
    };
  }

  fetchWellplatesByUIState(params, action) {
    return (dispatch) => {
      WellplatesFetcher.fetchWellplatesByUIState(params)
        .then((result) => {
          dispatch({ wellplates: result, collection_id: params.wellplate.collection_id, action });
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchDeviceDescriptionsByUIState(params, action) {
    return (dispatch) => {
      DeviceDescriptionFetcher.fetchDeviceDescriptionsByUIStateAndLimit(params)
        .then((result) => {
          dispatch({ device_descriptions: result, collection_id: params.ui_state.collection_id, action });
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchSequenceBasedMacromoleculeSamplesByUIState(params, action) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.fetchSequenceBasedMacromoleculeSamplesByUIStateAndLimit(params)
        .then((result) => {
          dispatch(
            { sequence_based_macromolecule_samples: result, collection_id: params.ui_state.collection_id, action: action }
          );
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchElementAndBuildCopy(sample, collection_id, action) {
    sample.collection_id = collection_id;
    return (
      { samples: [sample], collection_id: collectionId, action }
    );
  }

  fetchDeviceDescriptionAndBuildCopy(deviceDescription, collectionId, action) {
    const newDeviceDescription = new DeviceDescription(deviceDescription);
    newDeviceDescription.collection_id = collectionId;
    return { device_descriptions: [newDeviceDescription], collection_id: collectionId, action };
  }

  fetchSequenceBasedMacromoleculeSamplesAndBuildCopy(sequence_based_macromolecule_sample, collection_id) {
    const newSequenceBasedMacromoleculeSample =
      new SequenceBasedMacromoleculeSample(sequence_based_macromolecule_sample.serializeForCopy());
    newSequenceBasedMacromoleculeSample.collection_id = collection_id;
    return (
      { sequence_based_macromolecule_samples: [newSequenceBasedMacromoleculeSample], collection_id: collection_id }
    )
  }
}

export default alt.createActions(ClipboardActions);
