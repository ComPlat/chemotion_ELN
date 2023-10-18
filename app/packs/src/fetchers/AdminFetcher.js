import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class AdminFetcher {
  static fetchLocalCollector() {
    return fetch('/api/v1/admin/listLocalCollector/all.json', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static checkDiskSpace() {
    return fetch('/api/v1/admin/disk.json', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchDevices() {
    return fetch('/api/v1/admin/listDevices/all.json', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchDeviceById(deviceId) {
    return fetch(`/api/v1/admin/device/${deviceId}`, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchDeviceMetadataByDeviceId(deviceId) {
    return fetch(`/api/v1/admin/deviceMetadata/${deviceId}`, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static postDeviceMetadata(params) {
    return fetch('/api/v1/admin/deviceMetadata', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static syncDeviceMetadataToDataCite(params) {
    return fetch(
      `/api/v1/admin/deviceMetadata/${params.device_id}/sync_to_data_cite`,
      {
        credentials: 'same-origin',
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      }
    )
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static testSFTP(params) {
    return fetch('/api/v1/admin/sftpDevice/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static removeDeviceMethod(params) {
    return fetch('/api/v1/admin/removeDeviceMethod/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateDeviceMethod(params) {
    return fetch('/api/v1/admin/updateDeviceMethod/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static editNovncSettings(params) {
    return fetch('/api/v1/admin/editNovncSettings/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).then(response => {
      if (response.status === 204) {
        return '';
      }
      return 'error';
    });
  }

  static resetUserPassword(params) {
    return fetch('/api/v1/admin_user/resetPassword/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static createUserAccount(params) {
    return fetch('/api/v1/admin_user/newUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateUser(params) {
    return fetch('/api/v1/admin_user/updateUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchUsers() {
    return fetch('/api/v1/admin_user/listUsers/all.json', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchUsersByNameType(name, type, limit = 5) {
    return fetch(
      `/api/v1/admin_user/listUsers/byname.json?${new URLSearchParams({
        name,
        type,
        limit,
      })}`,
      {
        credentials: 'same-origin',
        method: 'GET',
      }
    )
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateAccount(params) {
    return fetch('/api/v1/admin_user/updateAccount/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static olsTermDisableEnable(params) {
    return fetch('/api/v1/admin/olsEnableDisable/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).then(response => {
      if (response.status === 204) {
        return true;
      }
    });
  }

  static importOlsTerms(file) {
    const data = new FormData();
    data.append('file', file);

    return fetch('/api/v1/admin/importOlsTerms/', {
      credentials: 'same-origin',
      method: 'POST',
      body: data,
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchGroupsDevices(type) {
    return fetch(`/api/v1/admin/group_device/list?type=${type}`, {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateGroup(params = {}) {
    return fetch(`/api/v1/admin/group_device/update/${params.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static createGroupDevice(params = {}) {
    return fetch('/api/v1/admin/group_device/create', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchMatrices() {
    return fetch('/api/v1/matrix/list.json', {
      credentials: 'same-origin',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateMatrice(params) {
    return fetch('/api/v1/matrix/update/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static updateMatriceJson(params) {
    return fetch('/api/v1/matrix/update_json/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchJobs() {
    return fetch('/api/v1/admin/jobs', {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.error(errorMessage);
      });
  }

  static restartJob(id) {
    return fetch('/api/v1/admin/jobs/restart/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(id),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.error(errorMessage);
      });
  }
}
