import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class AdminDeviceFetcher {
  static fetchDevices() {
    return ApiClient.getJson('/api/v1/admin_devices');
  }

  static fetchDevicesByName(name, limit = 5) {
    const getParams = new URLSearchParams({ name, limit });

    return ApiClient.getJson(`/api/v1/admin_devices/byname?${getParams}`);
  }

  static fetchDeviceById(deviceId) {
    return ApiClient.getJson(`/api/v1/admin_devices/${deviceId}`);
  }

  static createDevice(device) {
    return ApiClient.postJson('/api/v1/admin_devices', { body: device });
  }

  static updateDevice(device) {
    return ApiClient.putJson(`/api/v1/admin_devices/${device.id}`, { body: device });
  }

  static deleteDevice(deviceId) {
    return ApiClient.deleteRequest(`/api/v1/admin_devices/${deviceId}`);
  }

  static deleteRelation(userId, deviceId) {
    const body = { id: userId, device_id: deviceId };

    return ApiClient.putJson(`/api/v1/admin_devices/delete_relation/${userId}`, { body });
  }

  static testSFTP(device) {
    return ApiClient.postJson('/api/v1/admin_devices/test_sftp', { body: device });
  }
}
