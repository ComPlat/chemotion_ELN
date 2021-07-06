import 'whatwg-fetch';

export default class PermissionsFetcher {
  static fetchPermissionStatus(params) {
    return fetch('/api/v1/permissions/status/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
