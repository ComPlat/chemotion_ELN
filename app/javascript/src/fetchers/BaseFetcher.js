import 'whatwg-fetch';

import UIStore from 'src/stores/alt/stores/UIStore';
import CellLine from 'src/models/cellLine/CellLine';
import Vessel from 'src/models/vessel/Vessel';
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
    const getParams = {}

    getParams.page = queryParams.page || 1;
    getParams.per_page = queryParams.per_page || UIStore.getState().number_of_results;
    getParams.filter_created_at = (queryParams.filterCreatedAt === true);
    getParams.product_only = (queryParams.productOnly === true);

    if (isSync) getParams.sync_collection_id = id;
    if (!isSync) getParams.collection_id = id;
    if (queryParams.fromDate) getParams.from_date = `${dateToUnixTimestamp(queryParams.fromDate)}`;
    if (queryParams.toDate)  getParams.to_date = `${dateToUnixTimestamp(queryParams.toDate)}`;
    if (queryParams.userLabel) getParams.user_label = `${queryParams.userLabel}`;
    let addQuery = '';
    let userState;
    let group;
    let sort;
    let direction;
    let filters;
    let reaction;
    let sortColumn;


    // override some params based on what elements are being fetched
    if (type == 'samples') {
      getParams.molecule_sort = (queryParams.moleculeSort ? 1 : 0);
    }
    if (type == 'reactions') {
      userState = UserStore.getState();
      // if the user has not updated its profile yet, we set the default sort to created_at
      if (!filters.reaction) {
        getParams.sort_column = 'created_at';
        getParams.sort_direction = 'DESC';
      } else {
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

        getParams.sort_column = sortColumn;
        getParams.sort_direction = direction;
      }
    }
    if (type == 'generic_elements') {
      userState = UserStore.getState();
      filters = userState?.profile?.data?.filters || {};
      group = filters[queryParams.name]?.group || 'none';
      sort = filters[queryParams.name]?.sort || false;

      getParams.el_type = queryParams.name
      getParams.sort_column = (sort && group) || 'updated_at'
    }

    // build string from object
    const paramsString = Object.entries(getParams)
                               .map(([key, value]) => { `${key}=${value}` })
                               .join("&")
    const apiURL = `/api/v1/${type}.json?`.concat(paramsString)

    return fetch(apiURL, {
      credentials: 'same-origin'
    }).then((response) => (
      response.json().then((json) => ({
        elements: json[type].map((r) => {
          if (type === 'cell_lines') {
            return CellLine.createFromRestResponse(id, r);
          }
          if (type === 'vessels') {
            return Vessel.createFromRestResponse(id, r);
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
