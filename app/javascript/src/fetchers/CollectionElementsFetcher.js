import 'whatwg-fetch';

export default class CollectionElementsFetcher {
  static addElementsToCollection(params) {
    return fetch('/api/v1/collection_elements',
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(params)
      }
    )
      .then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }

  static deleteElementsFromCollection(params) {
    return fetch(
      `/api/v1/collection_elements/${params.collection_id}`,
      {
        ...this._httpOptions('DELETE'),
        body: JSON.stringify(params)
      }
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
