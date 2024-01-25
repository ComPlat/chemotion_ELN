import 'whatwg-fetch';

export default class AdminDeviceMetadataFetcher {
  static fetchDeviceMetadataByDeviceId(deviceId) {
    return fetch(
      `/api/v1/admin_device_metadata/${deviceId}`,
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static postDeviceMetadata(params) {
    return fetch(
      '/api/v1/admin_device_metadata', 
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params),
      }
    ).then(response => response.json())
      .then(json => json)
      .catch(errorMessage => console.log(errorMessage));
  }

  static syncDeviceMetadataToDataCite(params) {
    return fetch(
      `/api/v1/admin_device_metadata/${params.device_id}/sync_to_data_cite`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(params),
      }
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
