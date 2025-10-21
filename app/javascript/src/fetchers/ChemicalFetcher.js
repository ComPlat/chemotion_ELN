import 'whatwg-fetch';
import Chemical from 'src/models/Chemical';

export default class ChemicalFetcher {
  // Fetch chemical by either sample_id or sequence_based_macromolecule_sample_id, depending on type
  static fetchChemical(id, type) {
    const paramName = type === 'SBMM' ? 'sequence_based_macromolecule_sample_id' : 'sample_id';
    return fetch(`/api/v1/chemicals?${paramName}=${id}&type=${type}`, {
      credentials: 'same-origin',
    }).then((response) => response.json())
      .then((json) => new Chemical(json))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static create(data) {
    const params = { ...data };
    return fetch('/api/v1/chemicals/create', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static update(params) {
    // type should be 'sample' or 'sequence_based_macromolecule'
    let query = '';
    const { type } = params;
    if (type === 'SBMM') {
      query = `sequence_based_macromolecule_sample_id=${params.sequence_based_macromolecule_sample_id}&type=${type}`;
    } else {
      query = `sample_id=${params.sample_id}&type=${type}`;
    }
    return fetch(`/api/v1/chemicals?${query}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchSafetySheets(queryParams) {
    return fetch(`/api/v1/chemicals/fetch_safetysheet/${queryParams.id}`
       + `?data[vendor]=${queryParams.vendor}&data[option]=${queryParams.queryOption}`
        + `&data[language]=${queryParams.language}&data[searchStr]=${queryParams.string}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        return response.text();
      }
      return null;
    }).catch((errorMessage) => {
      console.log(errorMessage);
      return null;
    });
  }

  static saveSafetySheets(params) {
    return fetch('/api/v1/chemicals/save_safety_datasheet', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return response.json().then((errorData) => {
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      });
    }).catch((errorMessage) => {
      console.error(errorMessage);
      throw errorMessage;
    });
  }

  static saveManualAttachedSafetySheet(params) {
    return fetch('/api/v1/chemicals/save_manual_sds', {
      credentials: 'same-origin',
      method: 'post',
      body: params
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static safetyPhrases(queryParams) {
    return fetch(`/api/v1/chemicals/safety_phrases/${queryParams.id}?vendor=${queryParams.vendor}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      if (response.status === 204) {
        return response.status;
      }
      return response.json();
    }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static chemicalProperties(productLink) {
    return fetch(`/api/v1/chemicals/chemical_properties?link=${productLink}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
