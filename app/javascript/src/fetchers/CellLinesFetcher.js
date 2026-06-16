import ApiClient from 'src/api_clients/ChemotionApiClient';
import CellLine from 'src/models/cellLine/CellLine';
import Container from 'src/models/Container';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

import {
  extractApiParameter,
  successfullyCreatedParameter,
  successfullyCopiedParameter,
  successfullyUpdatedParameter,
  successfullySplittedParameter,
  errorMessageParameter
} from 'src/utilities/CellLineUtils';

export default class CellLinesFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/cell_lines?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.cell_lines.map((cellLine) => (CellLine.createFromRestResponse(id, cellLine))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/cell_lines/${id}`)
      .then((json) => this.cellLineElement(0, json));
  }

  static create(cellLine, user) {
    const params = extractApiParameter(cellLine);

    return AttachmentFetcher.uploadNewAttachmentsForContainer(cellLine.container)
      .then(() => ApiClient.postJson('/api/v1/cell_lines', {
        body: params,
        handleResponseError: (exception) => {
          console.log(exception);
          NotificationActions.add(errorMessageParameter);
          return cellLine;
        },
      }))
      .then((json) => GenericElsFetcher.uploadGenericFiles(cellLine, json.id, 'CellLineSample')
        .then(() => {
          NotificationActions.add(successfullyCreatedParameter);
          // eslint-disable-next-line no-param-reassign
          user.cell_lines_count += 1;
          return this.cellLineElement(params.collection_id, json);
        }));
  }

  static getAllCellLineNames() {
    return ApiClient.getJson('/api/v1/cell_lines/names/all');
  }

  static getCellLineMaterialById(id) {
    return ApiClient.getJson(`/api/v1/cell_lines/material/${id}`);
  }

  static copyCellLine(cellLineId, collectionId) {
    const body = {
      id: cellLineId,
      collection_id: collectionId,
      container: Container.init()
    };

    return ApiClient.postJson('/api/v1/cell_lines/copy', { body })
      .then((json) => {
        NotificationActions.add(successfullyCopiedParameter);
        return this.cellLineElement(collectionId, json);
      });
  }

  static update(cellLineItem) {
    const params = extractApiParameter(cellLineItem);

    return AttachmentFetcher.uploadNewAttachmentsForContainer(cellLineItem.container)
      .then(() => AnnotationsFetcher.updateAnnotationsInContainer(cellLineItem))
      .then(() => ApiClient.putJson('/api/v1/cell_lines', {
        body: params,
        handleResponseError: (exception) => {
          console.log(exception);
          NotificationActions.add(errorMessageParameter);
          return cellLineItem;
        },
      }))
      .then((json) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return this.cellLineElement(params.collection_id, json);
      });
  }

  // Here better as parameter list of ids
  static splitAsSubCellLines(ids, collectionId) {
    const promises = [];

    ids.forEach((id) => {
      const params = { id, collection_id: collectionId };
      promises.push(ApiClient.postJson('/api/v1/cell_lines/split', { body: params }));
    });

    return Promise.all(promises)
      .then(() => { NotificationActions.add(successfullySplittedParameter); });
  }

  static cellLineElement(id, json) {
    if (json.error) {
      return new CellLine({ id: `${id}:error:CellLine ${id} is not accessible!` });
    }
    return CellLine.createFromRestResponse(id, json);
  }
}
