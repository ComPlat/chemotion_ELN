import BaseFetcher from './BaseFetcher'
import Device from '../models/Device'
import DeviceAnalysis from '../models/DeviceAnalysis'

export default class DeviceFetcher {
  static fetchAll() {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: '/api/v1/devices/',
      requestMethod: 'GET',
      jsonTranformation: (json) => json.devices.map(device => new Device(device))
    })
  }

  static fetchById(deviceId) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/devices/${deviceId}`,
      requestMethod: 'GET',
      jsonTranformation: (json) => new Device(json.device)
    })
  }

  static fetchAnalysisByIdAndType(deviceId, sampleId, analysisType) { 
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/devices/${deviceId}/samples/${sampleId}/${analysisType}`,
      requestMethod: 'GET',
      jsonTranformation: (json) => new DeviceAnalysis(json.devices_analysis)
    })
  }

  static create(device) {
    return BaseFetcher.withBodyData({
      apiEndpoint: '/api/v1/devices',
      requestMethod: 'POST',
      bodyData: device,
      jsonTranformation: (json) => new Device(json.device)
    })
  }

  static changeSelectedDevice(device) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/devices/${device.id}/selected`,
      requestMethod: 'POST',
      jsonTranformation: (json) => json
    })
  }

  static update(device) {
    return BaseFetcher.withBodyData({
      apiEndpoint: `/api/v1/devices/${device.id}`,
      requestMethod: 'PUT',
      bodyData: device,
      jsonTranformation: (json) => new Device(json.device)
    })
  }

  static delete(device) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/devices/${device.id}`,
      requestMethod: 'DELETE',
      jsonTranformation: (json) => {new Device(json.device)}
    })
  }
}
