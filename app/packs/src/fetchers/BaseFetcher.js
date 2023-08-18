import 'whatwg-fetch';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class BaseFetcher {
  /**
   * @param {Object} params = { apiEndpoint, requestMethod, bodyData, jsonTranformation }
   */
  static withBodyData(params) {
    const {
      apiEndpoint, requestMethod, bodyData, jsonTranformation
    } = params;
    const promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    }).then((response) => response.json())
      .then((json) => jsonTranformation(json))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  /**
   * @param {Object} params = { apiEndpoint, requestMethod, jsonTranformation }
   */
  static withoutBodyData(params) {
    const { apiEndpoint, requestMethod, jsonTranformation } = params;

    const promise = fetch(apiEndpoint, {
      credentials: 'same-origin',
      method: requestMethod
    }).then((response) => response.json())
      .then((json) => jsonTranformation(json))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, type = 'samples', ElKlass) {
    const page = queryParams.page || 1;
    const perPage = queryParams.per_page || UIStore.getState().number_of_results;
    const filterCreatedAt = queryParams.filterCreatedAt === true ? '&filter_created_at=true' : '&filter_created_at=false';
    const fromDate = queryParams.fromDate ? `&from_date=${queryParams.fromDate.unix()}` : '';
    const toDate = queryParams.toDate ? `&to_date=${queryParams.toDate.unix()}` : '';
    const productOnly = queryParams.productOnly === true ? '&product_only=true' : '&product_only=false';
    const api = `/api/v1/${type}.json?collection_id=${id}&page=${page}&per_page=${perPage}&`
              + `${fromDate}${toDate}${filterCreatedAt}${productOnly}`;
    let addQuery = '';
    let userState;
    let group;
    let sort;
    let filters;

    switch (type) {
      case 'samples':
        addQuery = `&product_only=${queryParams.productOnly || false}&molecule_sort=${queryParams.moleculeSort ? 1 : 0}`;
        break;
      case 'reactions':
        userState = UserStore.getState();
        filters = userState?.profile?.data?.filters || {};
        group = filters.reaction?.group || 'created_at';
        sort = filters.reaction?.sort || false;
        addQuery = group === 'none'
          ? '&sort_column=created_at'
          : `&sort_column=${sort && group ? group : 'updated_at'}`;
        break;
      case 'generic_elements':
        userState = UserStore.getState();
        filters = userState?.profile?.data?.filters || {};
        group = filters[queryParams.name]?.group || 'none';
        sort = filters[queryParams.name]?.sort || false;
        addQuery = `&el_type=${queryParams.name}&sort_column=${(sort && group) || 'updated_at'}`;
        break;
      default:
    }

    return fetch(api.concat(addQuery), {
      credentials: 'same-origin'
    }).then((response) => (
      response.json().then((json) => ({
        elements: json[type].map((r) => (new ElKlass(r))),
        totalElements: parseInt(response.headers.get('X-Total'), 10),
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10)
      }))
    )).catch((errorMessage) => { console.log(errorMessage); });
  }

  static getAttachments(container, attachments = []) {
    Array.prototype.push.apply(attachments, container.attachments);
    container.children
      .forEach((child) => BaseFetcher.getAttachments(child, attachments));

    return attachments;
  }

  static updateAnnotationsInContainer(element) {
    const updateTasks = [];

    const attachments = BaseFetcher.getAttachments(element.container, []);

    attachments
      .filter((attach) => attach.updatedAnnotation)
      .forEach((attach) => {
        const data = new FormData();
        data.append('updated_svg_string', attach.updatedAnnotation);
        const updateTask = fetch(`/api/v1/attachments/${attach.id}/annotation`, {
          credentials: 'same-origin',
          method: 'post',
          body: data
        })
          .catch((errorMessage) => {
            console.log(errorMessage);
          });
        updateTasks.push(updateTask);
      });

    return Promise.all(updateTasks);
  }
}
