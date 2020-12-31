import 'whatwg-fetch';
import BaseFetcher from './BaseFetcher';

export default class AdminFetcher {
  static fetchUnitsSystem() {
    return fetch('/units_system/units_system.json', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' }
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchLocalCollector() {
    return fetch('/api/v1/admin/listLocalCollector/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static checkDiskSpace() {
    return fetch('/api/v1/admin/disk.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchDevices() {
    return fetch('/api/v1/admin/listDevices/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchDeviceById(deviceId) {
    return fetch(`/api/v1/admin/device/${deviceId}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static testSFTP(params) {
    return fetch('/api/v1/admin/sftpDevice/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static removeDeviceMethod(params) {
    return fetch('/api/v1/admin/removeDeviceMethod/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateDeviceMethod(params) {
    return fetch('/api/v1/admin/updateDeviceMethod/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
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
    }).then((response) => {
      if (response.status === 204) { return ''; }
      return 'error';
    });
  }

  static resetUserPassword(params) {
    return fetch('/api/v1/admin/resetPassword/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createUserAccount(params) {
    return fetch('/api/v1/admin/newUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateUser(params) {
    return fetch('/api/v1/admin/updateUser/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchUsers() {
    return fetch('/api/v1/admin/listUsers/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateAccount(params) {
    return fetch('/api/v1/admin/updateAccount/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static olsTermDisableEnable(params) {
    return fetch('/api/v1/admin/olsEnableDisable/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
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
      body: data
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchGroupsDevices(type) {
    return fetch(`/api/v1/admin/group_device/list?type=${type}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateGroup(params = {}) {
    return fetch(`/api/v1/admin/group_device/update/${params.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchUsersByNameType(name, type) {
    return fetch(`/api/v1/admin/group_device/name.json?type=${type}&name=${name}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createGroupDevice(params = {}) {
    return fetch('/api/v1/admin/group_device/create', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchUserGroupByName(name) {
    return fetch(`/api/v1/admin/matrix/find_user.json?name=${name}`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchMatrices() {
    return fetch('/api/v1/admin/matrix/list.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateMatrice(params) {
    return fetch('/api/v1/admin/matrix/update/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateMatriceJson(params) {
    return fetch('/api/v1/admin/matrix/update_json/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static exec(path, method) {
    return BaseFetcher.withoutBodyData({
      apiEndpoint: path, requestMethod: method, jsonTranformation: json => json
    });
  }

  static genericKlass(params, path) {
    return BaseFetcher.withBodyData({
      apiEndpoint: `/api/v1/admin/${path}/`, requestMethod: 'POST', bodyData: params, jsonTranformation: json => json
    });
  }

  static fetchElementKlasses() {
    return this.exec('/api/v1/generic_elements/klasses_all.json', 'GET');
  }

  static updateGElTemplates(params) {
    return this.genericKlass(params, 'update_element_template');
  }

  static createElementKlass(params) {
    return this.genericKlass(params, 'create_element_klass');
  }

  static updateElementKlass(params) {
    return this.genericKlass(params, 'update_element_klass');
  }

  static activeInActiveElementKlass(params) {
    return this.genericKlass(params, 'de_active_element_klass');
  }

  static deleteElementKlass(params) {
    return this.genericKlass(params, 'delete_element_klass');
  }

  static createSegmentKlass(params) {
    return this.genericKlass(params, 'create_segment_klass');
  }

  static updateSegmentKlass(params) {
    return this.genericKlass(params, 'update_segment_klass');
  }

  static deActiveSegmentKlass(params) {
    return this.genericKlass(params, 'de_active_segment_klass');
  }

  static updateSegmentTemplate(params) {
    return this.genericKlass(params, 'update_segment_template');
  }

  static deleteSegmentKlass(id) {
    return this.exec(`/api/v1/admin/delete_segment_klass/${id}`, 'DELETE');
  }

  static listSegmentKlass(params = {}) {
    const api = params.is_active === undefined ? '/api/v1/admin/list_segment_klass.json' : `/api/v1/admin/list_segment_klass.json?is_active=${params.is_active}`;
    return this.exec(api, 'GET');
  }
}
