import CellLine from 'src/models/cellLine/CellLine';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

import {
  extractApiParameter

} from 'src/utilities/CellLineUtils';

const successfullyCreatedParameter = {
  title: 'Element created',
  message: 'Cell line sample successfully added',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Cell line sample successfully updated',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const errorMessageParameter = {
  title: 'Error',
  message: 'Unfortunately, the last action failed. Please try again or contact your admin.',
  level: 'error',
  dismissible: 'button',
  autoDismiss: 30,
  position: 'tr'
};

export default class CellLinesFetcher {

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'cell_lines', CellLine);
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/cell_lines/${id}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
      .then((response) => response.json())
      .then((json) => CellLine.createFromRestResponse(0, json))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static create(cellLine,user) {
    const params = extractApiParameter(cellLine);

    const promise = CellLinesFetcher.uploadAttachments(cellLine)
      .then(() => fetch('/api/v1/cell_lines', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(params)
      }))

      .then((response) => response.json())
      .then((json) => { GenericElsFetcher.uploadGenericFiles(cellLine, json.id, 'CellLineSample'); return json; })
      .then((json) => CellLine.createFromRestResponse(params.collection_id, json))
      .then((cellLineItem) => {
        NotificationActions.add(successfullyCreatedParameter);
        user.cell_lines_count = user.cell_lines_count +1;
        return cellLineItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return cellLine;
      });

    return promise;
  }

  static uploadAttachments(cellLine) {
    const files = AttachmentFetcher.getFileListfrom(cellLine.container);

    if (files.length > 0) {
      const tasks = [];
      files.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => {
        Promise.resolve(1);
      });
    }
    return Promise.resolve(1);
  }

  static getAllCellLineNames() {
    return fetch('/api/v1/cell_lines/names/all', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => response.json());
  }

  static getCellLineMaterialById(id) {
    return fetch(`/api/v1/cell_lines/material/${id}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => response.json());
  }

  static update(cellLineItem) {
    const params = extractApiParameter(cellLineItem);
    const promise = CellLinesFetcher.uploadAttachments(cellLineItem)
      .then(() => fetch('/api/v1/cell_lines', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'PUT',
        body: JSON.stringify(params)
      }))
      .then((response) => response.json())
      .then(() => {BaseFetcher.updateAnnotationsInContainer(cellLineItem)})
      .then(()=> CellLinesFetcher.fetchById(cellLineItem.id))
      .then((loadedCellLineSample) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return loadedCellLineSample;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return cellLineItem;
      });
    return promise;
  }
}
