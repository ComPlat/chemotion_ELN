// import { json } from 'd3';
import 'whatwg-fetch';
import Inventory from '../models/Inventory';

function classify(string) {
  if (string.includes('_')) {
    var substrings = string.split('_');
    for (let i=0; i<substrings.length; i++) {
      substrings[i] = substrings[i].charAt(0).toUpperCase() + substrings[i].slice(1);
    }
    string = substrings.join('')
  }
  else {
    string = string.charAt(0).toUpperCase() + string.slice(1);
  }
  return string;
}

export default class InventoryFetcher {

  static fetchByInventoriableId(inventoriable_id, inventoriable_type) {
    return fetch(`/api/v1/inventories?inventoriable_id=${inventoriable_id}&inventoriable_type=${classify(inventoriable_type)}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => new Inventory(json))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static create(prms) {
    const params = { ...prms };
    if (prms.inventoriable_type) {
      params.inventoriable_type = classify(prms.inventoriable_type);
    }
    return fetch('/api/v1/inventories/create', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static update(params) {
    return fetch(`/api/v1/inventories/${params.inventoriable_id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchSds(queryParams) {
    return fetch(`/api/v1/inventories/fetchsds/${queryParams.id}?data[vendor]=${queryParams.vendor}&data[option]=${queryParams.queryOption}&data[language]=${queryParams.language}`, {
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

  static saveSds(params) {
    return fetch('/api/v1/inventories/save_sds', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static safetyPhrases(queryParams) {
    return fetch(`/api/v1/inventories/safety_phrases/${queryParams.id}?vendor=${queryParams.vendor}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {console.log(errorMessage);
    });
  }

  static chemicalProperties(productLink) {
    return fetch(`/api/v1/inventories/chemical_properties?link=${productLink}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {console.log(errorMessage);
    });
  }
}
