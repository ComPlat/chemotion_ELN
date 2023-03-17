import 'whatwg-fetch';
import Chemical from 'src/models/Chemical';

export default class ChemicalFetcher {
  static fetchChemical(sampleId) {
    return fetch(`/api/v1/chemicals?sample_id=${sampleId}`, {
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
    return fetch(`/api/v1/chemicals/${params.sample_id}`, {
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
    return fetch(`/api/v1/chemicals/fetch_safetysheet/${queryParams.id}?data[vendor]=${queryParams.vendor}&data[option]=${queryParams.queryOption}&data[language]=${queryParams.language}&data[searchStr]=${queryParams.string}`, {
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
    }).catch((errorMessage) => {
      console.log(errorMessage);
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
