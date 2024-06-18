import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import AdminDeviceMetadataFetcher from 'src/fetchers/AdminDeviceMetadataFetcher';

const newDeviceMetadata = {
  id: '',
  device_id: '',
  doi: '',
  url: '',
  landing_page: '',
  name: '',
  type: '',
  description: '',
  publisher: '',
  publication_year: '',
  manufacturers: '',
  owners: '',
  dates: [],
  doi_sequence: 0,
  data_cite_prefix: '',
  data_cite_created_at: null,
  data_cite_updated_at: null,
  data_cite_version: '',
  data_cite_last_response: {},
  data_cite_state: 'draft',
  data_cite_creator_name: '',
}

export const DeviceMetadataStore = types
  .model({
    device_metadata: types.optional(types.frozen({}), newDeviceMetadata),
    error_message: types.optional(types.string, ''),
    success_message: types.optional(types.string, ''),
  })
  .actions(self => ({
    load: flow(function* loadDeviceMetadata(deviceId) {
      let result = yield AdminDeviceMetadataFetcher.fetchDeviceMetadataByDeviceId(deviceId);
      if (result && result.device_metadata) {
        self.setDeviceMetadata(result.device_metadata);
      }
    }),
    updateDeviceMetadata: flow(function* updateDeviceMetadata(deviceMetadata) {
      let result = yield AdminDeviceMetadataFetcher.postDeviceMetadata(deviceMetadata);
      if (result && result.device_metadata) {
        self.setDeviceMetadata(result.device_metadata);
        self.changeSuccessMessage('Metadata successfully saved');
      } else if (result.error) {
        self.changeErrorMessage(result.error);
      }
    }),
    syncDeviceMetadataToDataCite: flow(function* syncDeviceMetadataToDataCite(deviceMetadata) {
      let result = yield AdminDeviceMetadataFetcher.syncDeviceMetadataToDataCite(deviceMetadata);
      if (result && result.device_metadata) {
        self.setDeviceMetadata(result.device_metadata);
        self.changeSuccessMessage('Metadata successfully saved');
      } else if (result.error) {
        self.changeErrorMessage(result.error);
      }
    }),
    setDeviceMetadata(deviceMetadata) {
      self.device_metadata = deviceMetadata;
    },
    clearDeviceMetadata() {
      self.device_metadata = newDeviceMetadata;
    },
    changeDeviceMetadata(field, value) {
      let device_metadata = { ...self.device_metadata };
      device_metadata[field] = value;
      self.setDeviceMetadata(device_metadata);
    },
    changeDeviceMetadataDate(index, field, value) {
      let device_metadata = { ...self.device_metadata };
      device_metadata.dates[index][field] = value;
      self.setDeviceMetadata(device_metadata);
    },
    changeErrorMessage(message) {
      self.error_message = message;
    },
    changeSuccessMessage(message) {
      self.success_message = message;
    },
  }))
  .views(self => ({

  }));
