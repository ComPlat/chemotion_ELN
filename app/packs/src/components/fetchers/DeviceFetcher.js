import BaseFetcher from './BaseFetcher'
import Device from '../models/Device'
import DeviceAnalysis from '../models/DeviceAnalysis'
import _ from 'lodash'

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
      bodyData: device.serialize(),
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
  
  static fetchAnalysisById(analysisId) { 
    return BaseFetcher.withoutBodyData({
      apiEndpoint: `/api/v1/devices_analysis/${analysisId}`,
      requestMethod: 'GET',
      jsonTranformation: (json) => new DeviceAnalysis(json.devices_analysis)
    })
  }
  
  static createAnalysis(analysis) {
    return BaseFetcher.withBodyData({
      apiEndpoint: `/api/v1/devices_analysis`,
      requestMethod: 'POST',
      bodyData: analysis.serialize(),
      jsonTranformation: (json) => new DeviceAnalysis(json.devices_analysis)
    })
  }
  
  static updateAnalysis(analysis) {
    const {deviceId, sampleId, analysisType, experiments} = analysis
    return BaseFetcher.withBodyData({
      apiEndpoint: `/api/v1/devices_analysis/${analysis.id}`,
      requestMethod: 'PUT',
      bodyData: analysis.serialize(),
      jsonTranformation: (json) => new DeviceAnalysis(json.devices_analysis)
    })
  }

  static generateExperimentConfig(experiment) {
    return BaseFetcher.withBodyData({
      apiEndpoint: `/api/v1/icon_nmr/config`,
      requestMethod: 'POST',
      bodyData: experiment.buildConfig(),
      jsonTranformation: (json) => json
    })
  }
}
