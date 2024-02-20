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
      .then((json) => {
        if (json.error) {
          return new DeviceDescription({ id: `${id}:error:DeviceDescription ${id} is not accessible!`, is_new: true });
        } else {
          const deviceDescription = new DeviceDescription(json.device_description);
          deviceDescription._checksum = deviceDescription.checksum();
          return deviceDescription;
        }
      })
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
      .then((json) => {
        return new DeviceDescription(json.device_description);
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateDeviceDescription(deviceDescription) {
    return fetch(
      `/api/v1/device_descriptions/${deviceDescription.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(deviceDescription)
      }
    ).then(response => response.json())
      .then((json) => {
        const deviceDescription = new DeviceDescription(json.device_description);
        deviceDescription.updateChecksum();
        return deviceDescription;
      })
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
