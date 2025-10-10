import 'whatwg-fetch';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { downloadBlob } from 'src/utilities/FetcherHelper';

export default class CollectionsFetcher {
  static fetchCollections() {
    return fetch('/api/v1/collections', { ...this._httpOptions() })
      .then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static fetchByCollectionId(collectionId) {
    return fetch(`/api/v1/collections/${collectionId}`, { ...this._httpOptions() })
      .then(response => response.json())
      .then((json) => {
        return json.collection;
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static addCollection(params) {
    return fetch('/api/v1/collections',
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    )
      .then(response => response.json())
      .then((json) => {
        return json.collection;
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static buldUpdateForOwnCollections(params) {
    return fetch('/api/v1/collections/bulk_update_own_collections',
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(params)
      }
    ).then((response) => response.json())
      .then((json) => {
        return json.collections
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateCollection(collectionId, params) {
    return fetch(`/api/v1/collections/${collectionId}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(params)
      }
    ).then((response) => response.json())
      .then((json) => {
        return json.collection
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteCollection(collectionId) {
    return fetch(
      `/api/v1/collections/${collectionId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response.json())
      .then((json) => {
        return json.collections
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static _httpOptions(method = 'GET') {
    return {
      credentials: 'same-origin',
      method: method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
}
