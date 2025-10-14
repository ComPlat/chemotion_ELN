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
