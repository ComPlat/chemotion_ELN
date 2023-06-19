import 'whatwg-fetch';

export default class ThirdPartyAppFetcher {

  static fetchThirdPartyApps() {
    return fetch('/api/v1/third_party_apps/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static isNameUnique(name) {
    const obj = {
      name
    };
    return fetch('/api/v1/third_party_apps_administration/name_unique', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static newThirdPartyApp(name, IPAddress) {
    const obj = {
      name,
      IPAddress
    };
    return fetch('/api/v1/third_party_apps_administration/new_third_party_app', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static editThirdPartyApp(id, name, IPAddress) {
    const obj = {
      id: id,
      IPAddress: IPAddress,
      name: name
    };
    return fetch('/api/v1/third_party_apps_administration/update_third_party_app', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteThirdPartyApp(id) {
    const obj = {
      id
    };
    return fetch('/api/v1/third_party_apps_administration/delete_third_party_app', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchThirdPartyAppByID(id) {
    const obj = {
      id
    };
    const queryParams = new URLSearchParams(obj).toString();
    const url = `/api/v1/third_party_apps/get_by_id.json?${queryParams}`;

    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchThirdPartyAppNames() {
    return fetch('/api/v1/names/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchThirdPartyAppIp(name) {
    const obj = { name };
    const queryParams = new URLSearchParams(obj).toString();

    const url = `/api/v1/third_party_apps/IP.json?${queryParams}`;

    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchPublicURL() {
    return fetch('/api/v1/third_party_apps/public_IP.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchAttachmentToken(attID, userID, nameThirdPartyApp) {
    const obj = { attID, userID, nameThirdPartyApp };
    const queryParams = new URLSearchParams(obj).toString();
    const url = `/api/v1/third_party_apps/Token.json?${queryParams}`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

}
