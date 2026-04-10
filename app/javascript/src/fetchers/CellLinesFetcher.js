import CellLine from 'src/models/cellLine/CellLine';
import Container from 'src/models/Container';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

import {
  extractApiParameter,
  successfullyCreatedParameter,
  successfullyCopiedParameter,
  successfullyUpdatedParameter,
  successfullySplittedParameter,
  errorMessageParameter
} from 'src/utilities/CellLineUtils';

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

  static create(cellLine, user) {
    const params = extractApiParameter(cellLine);

    const promise = AttachmentFetcher.uploadNewAttachmentsForContainer(cellLine.container)
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
        user.cell_lines_count += 1;
        return cellLineItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return cellLine;
      });

    return promise;
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

  static copyCellLine(cellLineId, collectionId) {
    const params = {
      id: cellLineId,
      collection_id: collectionId,
      container: Container.init()
    };

    return fetch('/api/v1/cell_lines/copy/', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(params)
    }).then((response) => response.json())

      .then((json) => {
        NotificationActions.add(successfullyCopiedParameter);
        return CellLine.createFromRestResponse(collectionId, json);
      });
  }

  static update(cellLineItem) {
    const params = extractApiParameter(cellLineItem);
    const promise = AttachmentFetcher.uploadNewAttachmentsForContainer(cellLineItem.container)
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
      .then(() => { BaseFetcher.updateAnnotationsInContainer(cellLineItem); })
      .then(() => CellLinesFetcher.fetchById(cellLineItem.id))
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

  // Here better as parameter list of ids
  static splitAsSubCellLines(ids, collectionId) {
    const promises = [];

    ids.forEach((id) => {
      const params = { id, collection_id: collectionId };
      promises.push(fetch('/api/v1/cell_lines/split', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(params)
      }));
    });

    return Promise.all(promises)
      .then(() => { NotificationActions.add(successfullySplittedParameter); });
  }
}
