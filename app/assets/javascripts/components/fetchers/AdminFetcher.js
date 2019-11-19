import 'whatwg-fetch';

export default class AdminFetcher {
  static fetchLocalCollector() {
    const promise = fetch('/api/v1/admin/listLocalCollector/all.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
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
  static testSFTP(params) {
    const promise = fetch('/api/v1/admin/sftpDevice/', {
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
  static removeDeviceMethod(params) {
    const promise = fetch('/api/v1/admin/removeDeviceMethod/', {
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
  static editNovncSettings(params) {
    return fetch('/api/v1/admin/editNovncSettings/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then((response) => {
        if (response.status === 204) { return ''; }
        return 'error';
      });
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

  static updateUser(params) {
    const promise = fetch('/api/v1/admin/updateUser/', {
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

  static updateAccount(params) {
    const promise = fetch('/api/v1/admin/updateAccount/', {
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


  static olsTermDisableEnable(params) {
    const promise = fetch('/api/v1/admin/olsEnableDisable/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then((response) => {
        if (response.status === 204) {
          return true;
        }
      });
    return promise;
  }

  static importOlsTerms(file) {
    const data = new FormData();
    data.append('file', file);

    const promise = fetch('/api/v1/admin/importOlsTerms/', {
      credentials: 'same-origin',
      method: 'POST',
      body: data
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchGroupsDevices(type) {
    const promise = fetch(`/api/v1/admin/group_device/list?type=${type}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static updateGroup(params = {}) {
    const promise = fetch(`/api/v1/admin/group_device/update/${params.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchUsersByNameType(name, type) {
    const promise = fetch(`/api/v1/admin/group_device/name.json?type=${type}&name=${name}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static createGroupDevice(params = {}) {
    const promise = fetch('/api/v1/admin/group_device/create', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }
}
