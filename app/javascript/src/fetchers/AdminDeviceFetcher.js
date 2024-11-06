import 'whatwg-fetch';

export default class AdminDeviceFetcher {
  static fetchDevices() {
    return fetch(
      `/api/v1/admin_devices`, 
      this._httpOptions()
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchDevicesByName(name, limit = 5) {
    return fetch(
      `/api/v1/admin_devices/byname?${new URLSearchParams({
        name,
        limit,
      })}`,
      this._httpOptions()
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchDeviceById(deviceId) {
    return fetch(
      `/api/v1/admin_devices/${deviceId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static createDevice(device) {
    return fetch(
      `/api/v1/admin_devices`,
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(device),
      }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateDevice(device) {
    return fetch(
      `/api/v1/admin_devices/${device.id}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(device),
      }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteDevice(deviceId) {
    return fetch(
      `/api/v1/admin_devices/${deviceId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteRelation(userId, deviceId) {
    return fetch(
      `/api/v1/admin_devices/delete_relation/${userId}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify({
          id: userId,
          device_id: deviceId
        }),
      }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static testSFTP(device) {
    return fetch('/api/v1/admin_devices/test_sftp',
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(device),
      },
    ).then(response => response.json())
      .then(json => json)
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
