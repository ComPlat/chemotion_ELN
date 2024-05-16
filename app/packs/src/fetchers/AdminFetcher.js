import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class AdminFetcher {
  static fetchLocalCollector() {
    return fetch('/api/v1/admin/listLocalCollector/all.json', {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static checkDiskSpace() {
    return fetch('/api/v1/admin/disk.json', {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static resetUserPassword(params) {
    const { user_id, ...otherParams } = params;
    return fetch(`/api/v1/admin/users/${user_id}/resetPassword/`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otherParams),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static createUserAccount(params) {
    return fetch('/api/v1/admin/users', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateUser(params) {
    const { id, ...otherParams } = params;
    return fetch(`/api/v1/admin/users/${id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otherParams),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static deleteUser({ id }) {
    return fetch(`/api/v1/admin/users/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  static restoreAccount(params) {
    return fetch('/api/v1/admin/users/restoreAccount/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchUsers(id = null) {
    const url = id ? `/api/v1/admin/users/${id}` : '/api/v1/admin/users';
    return fetch(url, {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchUsersByNameType(name, type, limit = 5) {
    return fetch(
      `/api/v1/admin/users/byname.json?${new URLSearchParams({
        name,
        type,
        limit,
      })}`,
      {
        credentials: 'same-origin',
        method: 'GET',
      }
    )
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateAccount(params) {
    const { user_id, ...otherParams } = params;
    return fetch(`/api/v1/admin/users/${user_id}/profile/`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otherParams),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
    }).then((response) => {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchGroupsDevices(type) {
    return fetch(`/api/v1/admin/group_device/list?type=${type}`, {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static deleteGroupRelation(params = {}) {
    return fetch(`/api/v1/admin/group_device/delete_relation/${params.id}`, {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchMatrices() {
    return fetch('/api/v1/admin/matrix', {
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static updateMatrice(params) {
    return fetch('/api/v1/admin/matrix', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static fetchJobs() {
    return fetch('/api/v1/admin/jobs', {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.error(errorMessage);
      });
  }
}
