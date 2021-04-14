import 'whatwg-fetch';

import UIStore from '../stores/UIStore';

export default class BaseFetcher {
  /**
   * @param {Object} params = { apiEndpoint, requestMethod, bodyData, jsonTranformation }
   */
  static withBodyData(params) {
    const { apiEndpoint, requestMethod, bodyData, jsonTranformation } = params;
    let promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return jsonTranformation(json)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  /**
   * @param {Object} params = { apiEndpoint, requestMethod, jsonTranformation }
   */
  static withoutBodyData(params) {
    const { apiEndpoint, requestMethod, jsonTranformation } = params;

    let promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return jsonTranformation(json)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isSync = false, type = 'samples', ElKlass) {
    const page = queryParams.page || 1;
    const perPage = queryParams.per_page || UIStore.getState().number_of_results;
    const filterCreatedAt = queryParams.filterCreatedAt === true ? '&filter_created_at=true' : '&filter_created_at=false';
    const fromDate = queryParams.fromDate ? `&from_date=${queryParams.fromDate.unix()}` : '';
    const toDate = queryParams.toDate ? `&to_date=${queryParams.toDate.unix()}` : '';
    const api = `/api/v1/${type}.json?${isSync ? 'sync_' : ''}` +
              `collection_id=${id}&page=${page}&per_page=${perPage}&` +
              `${fromDate}${toDate}${filterCreatedAt}`;
    const sampleQuery = type === 'samples' ?
      `&product_only=${queryParams.productOnly || false}&molecule_sort=${queryParams.moleculeSort ? 1 : 0}`
      : '';
    return fetch(api.concat(sampleQuery), {
      credentials: 'same-origin'
    }).then(response => (
      response.json().then(json => ({
        elements: json[type].map(r => (new ElKlass(r))),
        totalElements: parseInt(response.headers.get('X-Total'), 10),
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10)
      }))
    )).catch((errorMessage) => { console.log(errorMessage); });
  }
}
