import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';

export default class ThirdPartyAppFetcher {

  static fetchThirdPartyApps() {
    return fetch('/api/v1/thirdPartyApps/listThirdPartyApps/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static newThirdPartyApp(userID, name, IPAddress) {
    const obj = {
      userID,
      name,
      IPAddress
    };
    return fetch('/api/v1/thirdPartyApps/newThirdPartyApp', {
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

  static editThirdPartyApp(userID, id, name, IPAddress) {
    const obj = {
      userID: userID,
      id: id,
      IPAddress: IPAddress,
      name: name
    };
    return fetch('/api/v1/thirdPartyApps/editThirdPartyApp', {
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

  static deleteThirdPartyApp(userID, id) {
    const obj = {
      userID,
      id
    };
    return fetch('/api/v1/thirdPartyApps/deleteThirdPartyApp', {
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
    const url = `/api/v1/thirdPartyApps/GetByIDThirdPartyApp/all.json?${queryParams}`;

    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchThirdPartyAppNames() {
    return fetch('/api/v1/thirdPartyApps/listThirdPartyAppNames/all.json', {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchThirdPartyAppIp(name) {
    const obj = { name };
    const queryParams = new URLSearchParams(obj).toString();

    const url = `/api/v1/thirdPartyApps/GetIPThirdPartyApp/all.json?${queryParams}`;

    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchAttachmentToken(attID, userID) {
    const obj = { attID, userID };
    const queryParams = new URLSearchParams(obj).toString();
    const url = `/api/v1/thirdPartyApps/GetAttachmentToken/all.json?${queryParams}`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

}