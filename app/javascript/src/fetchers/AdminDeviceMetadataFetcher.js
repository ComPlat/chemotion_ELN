import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class AdminDeviceMetadataFetcher {
  static fetchDeviceMetadataByDeviceId(deviceId) {
    return ApiClient.getJson(`/api/v1/admin_device_metadata/${deviceId}`);
  }

  static postDeviceMetadata(params) {
    return ApiClient.postJson('/api/v1/admin_device_metadata', { body: params });
  }

  static syncDeviceMetadataToDataCite(params) {
    return ApiClient.putJson(`/api/v1/admin_device_metadata/${params.device_id}/sync_to_data_cite`, { body: params });
  }
}
