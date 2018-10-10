import 'whatwg-fetch';

export default class AdminFetcher {
  static checkDiskSpace() {
    const promise = fetch('/api/v1/admin/disk.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static fetchDevices() {
    const promise = fetch('/api/v1/admin/listDevices/all.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
  static fetchDeviceById(deviceId) {
    const promise = fetch(`/api/v1/admin/device/${deviceId}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
  static updateDeviceMethod(params) {
    const promise = fetch('/api/v1/admin/updateDeviceMethod/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static resetUserPassword(params) {
    const promise = fetch('/api/v1/admin/resetPassword/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static confirmUserAccount(params) {
    const promise = fetch('/api/v1/admin/confirmUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static createUserAccount(params) {
    const promise = fetch('/api/v1/admin/newUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchUsers() {
    const promise = fetch('/api/v1/admin/listUsers/all.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
