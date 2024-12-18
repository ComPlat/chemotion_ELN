import 'whatwg-fetch';

export default class InventoryFetcher {
  static updateInventoryLabel(params) {
    const promise = fetch('/api/v1/inventory/update_inventory_label', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchLabelsAndCollections() {
    const promise = fetch('/api/v1/inventory/user_inventory_collections', {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchInventoryOfCollection(collectionId) {
    const promise = fetch(`/api/v1/inventory/${collectionId}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }
}
