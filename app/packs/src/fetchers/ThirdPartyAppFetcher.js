import 'whatwg-fetch';
import { ThirdPartyAppServices } from 'src/endpoints/ApiServices';
import UserStore from 'src/stores/alt/stores/UserStore';

const { TPA_ENDPOINT } = ThirdPartyAppServices;
const TPA_ENDPOINT_ADMIN = `${TPA_ENDPOINT}/admin`;

export default class ThirdPartyAppFetcher {
  static fetchThirdPartyApps(id = null) {
    const url = id ? `${TPA_ENDPOINT}/${id}` : TPA_ENDPOINT;
    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
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
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchAttachmentToken(attID, appID) {
    const queryParams = new URLSearchParams({ attID, appID }).toString();
    const url = `${TPA_ENDPOINT}/token?${queryParams}`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchCollectionAttachmentTokensByCollectionId() {
    const url = `${TPA_ENDPOINT}/collection_tpa_tokens`;
    return fetch(url, {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static update_attachment_token_with_action_type(key, action_type) {
    const { currentType } = UserStore.getState();
    const queryParams = new URLSearchParams({ key: key[0] });
    const url = `${TPA_ENDPOINT}/update_attachment_token_with_type?${queryParams}`;
    return fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action_type: action_type,
        type: currentType
      })
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
