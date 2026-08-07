import ApiClient from 'src/api_clients/ChemotionApiClient';
import Device from 'src/models/Device';
import DeviceAnalysis from 'src/models/DeviceAnalysis';
import { uniq } from 'lodash';

export default class DeviceFetcher {
  static fetchAll() {
    return ApiClient.getJson('/api/v1/devices')
      .then((json) => json.devices.map((device) => new Device(device)));
  }

  static fetchById(deviceId) {
    return ApiClient.getJson(`/api/v1/devices/${deviceId}`)
      .then((json) => new Device(json.device));
  }

  static create(device) {
    return ApiClient.postJson('/api/v1/devices', { body: device })
      .then((json) => new Device(json.device));
  }

  static changeSelectedDevice(device) {
    return ApiClient.postJson(`/api/v1/devices/${device.id}/selected`);
  }

  static update(device) {
    return ApiClient.putJson(`/api/v1/devices/${device.id}`, { body: device.serialize() })
      .then((json) => new Device(json.device));
  }

  static delete(device) {
    return ApiClient.deleteRequest(`/api/v1/devices/${device.id}`)
      .then((json) => new Device(json.device));
  }

  static fetchAnalysisById(analysisId) {
    return ApiClient.getJson(`/api/v1/devices_analysis/${analysisId}`)
      .then((json) => new DeviceAnalysis(json.devices_analysis));
  }

  static createAnalysis(analysis) {
    return ApiClient.postJson('/api/v1/devices_analysis', { body: analysis.serialize() })
      .then((json) => new DeviceAnalysis(json.devices_analysis));
  }

  static updateAnalysis(analysis) {
    return ApiClient.putJson(`/api/v1/devices_analysis/${analysis.id}`, { body: analysis.serialize() })
      .then((json) => new DeviceAnalysis(json.devices_analysis));
  }

  static generateExperimentConfig(experiment) {
    return ApiClient.postJson('/api/v1/icon_nmr/config', { body: experiment.buildConfig() });
  }

  static fetchCurrentConnection(selected, isNotFocused) {
    const searchTerm = { id: selected.id, status: isNotFocused };
    return ApiClient.getJson(`/api/v1/devices/current_connection?${new URLSearchParams(searchTerm)}`, {
      handleResponseError: (exception) => {
        console.error('Error fetching connections:', exception);
        return { using: 0, watching: 0 };
      },
    })
      .then((json) => {
        let using = 0;
        let watching = 0;
        if (json.result && Array.isArray(json.result) && json.result.length > 0) {
          const data = uniq(json.result)
            .filter((line) => line && line.includes(','))
            .map((line) => line.split(','));
          const conn = Object.fromEntries(data);

          Object.keys(conn).forEach((k) => {
            if (conn[k] === '0') { using += 1; }
            if (conn[k] === '1') { watching += 1; }
          });
        }
        return { using, watching };
      });
  }
}
