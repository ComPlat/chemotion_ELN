import alt from 'src/stores/alt/alt';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import DeviceDescription from 'src/models/DeviceDescription';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';

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

class ClipboardActions {
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

  fetchElementAndBuildCopy(sample, collectionId, action) {
    sample.collection_id = collectionId;
    return (
      { samples: [sample], collection_id: collectionId, action }
    );
  }

  fetchDeviceDescriptionAndBuildCopy(deviceDescription, collectionId, action) {
    const newDeviceDescription = new DeviceDescription(deviceDescription);
    newDeviceDescription.collection_id = collectionId;
    return { device_descriptions: [newDeviceDescription], collection_id: collectionId, action };
  }
}

export default alt.createActions(ClipboardActions);
