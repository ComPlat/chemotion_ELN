import 'whatwg-fetch';
import { ThirdPartyAppServices } from 'src/endpoints/ApiServices';

const { TPA_ENDPOINT } = ThirdPartyAppServices;
const TPA_ENDPOINT_ADMIN = `${TPA_ENDPOINT}/admin`;

export default class ThirdPartyAppFetcher {
  static fetchThirdPartyApps(id = null) {
    const url = id ? `${TPA_ENDPOINT}/${id}` : TPA_ENDPOINT;
    return fetch(url, {
      credentials: 'same-origin'
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static createOrUpdateThirdPartyApp(id, name, url, file_types) {
    const idPath = id ? `/${id}` : '';
    return fetch(`${TPA_ENDPOINT_ADMIN}${idPath}`, {
      credentials: 'same-origin',
      method: id ? 'PUT' : 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, url, file_types })
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteThirdPartyApp(id) {
    return fetch(`${TPA_ENDPOINT_ADMIN}/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchAttachmentToken(attID, appID) {
    const queryParams = new URLSearchParams({ attID, appID }).toString();
    const url = `${TPA_ENDPOINT}/token?${queryParams}`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then((response) => response.json())

      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static getHandlerUrl(attID, type) {
    const queryParams = new URLSearchParams({ attID, type }).toString();
    const url = `${TPA_ENDPOINT}/url?${queryParams}`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then((response) => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
