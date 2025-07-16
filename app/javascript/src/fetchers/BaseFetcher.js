import 'whatwg-fetch';

import UIStore from 'src/stores/alt/stores/UIStore';
import CellLine from 'src/models/cellLine/CellLine';
import UserStore from 'src/stores/alt/stores/UserStore';
import { dateToUnixTimestamp } from 'src/utilities/timezoneHelper';

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

  static fetchByCollectionId(id, queryParams = {}, isSync = false, type = 'samples', ElKlass) {
    const page = queryParams.page || 1;
    const perPage = queryParams.per_page || UIStore.getState().number_of_results;
    const filterCreatedAt = queryParams.filterCreatedAt === true
      ? '&filter_created_at=true' : '&filter_created_at=false';
    const fromDate = queryParams.fromDate ? `&from_date=${dateToUnixTimestamp(queryParams.fromDate)}` : '';
    const toDate = queryParams.toDate ? `&to_date=${dateToUnixTimestamp(queryParams.toDate)}` : '';
    const userLabel = queryParams.userLabel ? `&user_label=${queryParams.userLabel}` : '';
    const productOnly = queryParams.productOnly === true ? '&product_only=true' : '&product_only=false';
    const api = `/api/v1/${type}.json?${isSync ? 'sync_' : ''}`
      + `collection_id=${id}&page=${page}&per_page=${perPage}&`
      + `${fromDate}${toDate}${userLabel}${filterCreatedAt}${productOnly}`;
    let addQuery = '';
    let userState;
    let group;
    let sort;
    let direction;
    let filters;
    let reaction;
    let sortColumn;

    switch (type) {
      case 'samples':
        addQuery = `&product_only=${queryParams.productOnly || false}`
          + `&molecule_sort=${queryParams.moleculeSort ? 1 : 0}`;
        break;
      case 'reactions':
        userState = UserStore.getState();
        filters = userState?.profile?.data?.filters || {};
        reaction = userState?.profile?.data?.filters?.reaction || {};
        group = filters.reaction?.group || 'created_at';
        sort = filters.reaction?.sort || false;
        direction = filters.reaction?.direction || 'DESC';

        if (group === 'none') {
          sortColumn = sort ? 'created_at' : 'updated_at';
        } else if (sort && group) {
          sortColumn = group;
        } else {
          sortColumn = 'updated_at';
        }

        addQuery = `&sort_column=${sortColumn}&sort_direction=${direction}`;

        // if the user has not updated its profile yet, we set the default sort to created_at
        if (!filters.reaction) {
          addQuery = '&sort_column=created_at&sort_direction=DESC';
        }
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
        elements: json[type].map((r) => {
          if (type === 'cell_lines') {
            return CellLine.createFromRestResponse(id, r);
          }
          return (new ElKlass(r));
        }),
        totalElements: parseInt(response.headers.get('X-Total'), 10),
        page: parseInt(response.headers.get('X-Page'), 10),
        pages: parseInt(response.headers.get('X-Total-Pages'), 10),
        perPage: parseInt(response.headers.get('X-Per-Page'), 10)
      }))
    )).catch((errorMessage) => { console.log(errorMessage); });
  }

  static getAttachments(container, attachments = []) {
    if (!container || !container.attachments) { return attachments; }

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

  static updateAnnotationsForAttachments(attachments) {
    const updateTasks = [];
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

  static updateAnnotationsOfAttachments(element) {
    const updateTasks = [];
    if (!element.attachments) {
      return Promise.resolve();
    }
    element.attachments
      .filter(((attach) => attach.hasOwnProperty('updatedAnnotation')))
      .forEach((attach) => {
        const data = new FormData();
        data.append('updated_svg_string', attach.updatedAnnotation);
        updateTasks.push(fetch(`/api/v1/attachments/${attach.id}/annotation`, {
          credentials: 'same-origin',
          method: 'post',
          body: data
        })
          .catch((errorMessage) => {
            console.log(errorMessage);
          }));
      });

    return Promise.all(updateTasks);
  }

  static updateAnnotations(element) {
    return Promise.all(
      [
        BaseFetcher.updateAnnotationsOfAttachments(element),
        BaseFetcher.updateAnnotationsInContainer(element, [])
      ]
    );
  }
}
