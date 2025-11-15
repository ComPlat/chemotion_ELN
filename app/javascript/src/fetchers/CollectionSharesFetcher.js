import 'whatwg-fetch';

export default class CollectionSharesFetcher {
  static getCollectionSharedWithUsers(collectionId) {
    return fetch(`/api/v1/collection_shares.json?collection_id=${collectionId}`,
      { ...this._httpOptions() })
      .then(response => response.json())
      .then((json) => {
        return json.collection_shares;
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static addCollectionShare(params) {
    return fetch('/api/v1/collection_shares',
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    )
      .then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static updateCollectionShare(collectionShareId, params) {
    return fetch(`/api/v1/collection_shares/${collectionShareId}`,
      {
        ...this._httpOptions('PUT'),
        body: JSON.stringify(params)
      }
    ).then((response) => response.json())
      .then((json) => {
        return json.collection_share
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteCollectionShare(collectionId) {
    return fetch(
      `/api/v1/collection_shares/${collectionId}`,
      { ...this._httpOptions('DELETE') }
    ).then(response => response)
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
