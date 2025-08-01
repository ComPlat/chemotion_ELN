import 'whatwg-fetch';

export default class SequenceBasedMacromoleculesFetcher {
  static searchForSequenceBasedMacromolecule(search_term, search_field) {
    return fetch(`/api/v1/sequence_based_macromolecules?search_term=${search_term}&search_field=${search_field}`, 
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        return json
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static getSequenceBasedMacromoleculeByIdentifier(identifier, type) {
    return fetch(`/api/v1/sequence_based_macromolecules/${identifier}?type=${type}`, 
      { ...this._httpOptions() }
    ).then(response => response.json())
      .then((json) => {
        return json
      })
      .catch(errorMessage => console.log(errorMessage));
  }

  static changeRequestForSequenceBasedMacromolecule(sbmm_params) {
    return fetch('/api/v1/sequence_based_macromolecules/change_request/', 
      {
        ...this._httpOptions('POST'),
        body: JSON.stringify(sbmm_params)
      }
    ).then(response => response.json())
      .then((json) => json)
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
