import 'whatwg-fetch';
import Inventory from '../models/Inventory';

import { getFileName, downloadBlob } from '../utils/FetcherHelper';

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

  static fetchById(id) {
    return fetch(`/api/v1/inventories/${id}.json`, {
      credentials: 'same-origin'
    }).then(response => response.json())
      // .then(json => console.log(json))
      .then(json => new Inventory(json.inventory))
      // .then(json => console.log(json))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchByInventoriableId(inventoriable_id, inventoriable_type) {
    return fetch(`/api/v1/inventories?inventoriable_id=${inventoriable_id}&inventoriable_type=${classify(inventoriable_type)}`, {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => new Inventory(json.inventory))
      //.then(json => console.log(json.inventory))
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
      // .then(json => new Inventory(json.inventory))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static update(inventory) {
    return fetch(`/api/v1/inventories/${inventory.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inventory.serialize())
    }).then(response => response.json())
      .then(json => json)
      // .then(json => console.log(json))
      // .then(json => new Inventory(json.inventory))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static getsds(id) {
    return fetch(`/api/v1/inventories/fetchsds/${id}`, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/pdf',
        'Content-Type': 'pdf'
      }
    }).then((response) => {
      if (response.ok) {
        console.log(response);
        return response.blob();
      }
    }).then(blob => blob).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
  // let file_name;
  //   const arr = [];
  //   const promise = fetch(`/api/v1/inventories/fetchsds/${id}`, {
  //     credentials: 'same-origin',
  //     method: 'post',
  //     headers: {
  //       Accept: 'application/pdf',
  //       'Content-Type': 'pdf'
  //     }
  //   }).then((response) => {
  //     // console.log(response);
  //     if (response.ok) {
  //       // file_name = getFileName(response);
  //       return response.blob();
  //     }
  //     // console.log(response);
  //   }).then((blob) => {
  //     console.log(blob);
  //     arr.push(blob);
  //     // downloadBlob('Safety-Data-Sheet-Document', arr[0]);
  //   }).catch((errorMessage) => {
  //     console.log(errorMessage);
  //   });
  //   return arr;
  // }
}
