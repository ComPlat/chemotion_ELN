import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import DeviceDescription from 'src/models/DeviceDescription';

export default class DeviceDescriptionFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'device_descriptions', DeviceDescription);
  }

  static fetchById(deviceDescriptionId) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescriptionId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static createDeviceDescription(deviceDescription) {
    return fetch(
      `/api/v1/device_descriptions`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(deviceDescription)
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateDeviceDescription(deviceDescription) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescription.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(elementFormType)
      }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteDeviceDescription(deviceDescriptionId) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescriptionId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
