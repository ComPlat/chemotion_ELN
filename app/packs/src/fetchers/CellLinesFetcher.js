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
  static mockData = {};

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

  static create(cellLine) {
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
      .then((json) => CellLine.createFromRestResponse(params.collection_id, json))
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

  static {
    const c1 = CellLine.buildEmpty(0, 'FYA-C1');
    c1.cellLineName = 'Cell line 123';
    c1.cellLineId = 1;
    c1.id = '1';
    // ----- Material
    c1.organism = 'Mensch';
    c1.tissue = 'Lunge';
    c1.cellType = 'primary cells';
    c1.mutation = 'none';
    c1.disease = 'lung cancer';
    c1.bioSafetyLevel = 'S1';
    c1.variant = 'S1';
    c1.optimalGrowthTemperature = 36;
    c1.cryopreservationMedium = 'unknown';
    c1.name = '10-15';
    c1.gender = 'male';
    c1.materialDescription = 'Material 1';
    // ----- Item
    c1.amount = 1000;
    c1.passage = 10;
    c1.contamination = 'none';
    c1.source = 'IPB';
    c1.growthMedium = 'unknown';
    c1.itemDescription = '';
    c1.itemName = 'CellLine 001-001';
    c1.short_label = 'FMA-001';

    const c2 = CellLine.buildEmpty(0, 'FYA-C2');
    c2.cellLineName = 'Cell line 123';
    c2.cellLineId = 1;
    c2.id = '2';
    c2.organism = 'Mensch';
    c2.tissue = 'Lunge';
    c2.cellType = 'primary cells';
    c2.mutation = 'none';
    c2.gender = 'male';
    c2.disease = 'lung cancer';
    c2.bioSafetyLevel = 'S1';
    c2.variant = 'S1';
    c2.optimalGrowthTemperature = 36;
    c2.cryopreservationMedium = 'unknown';
    c2.name = '10-15';
    c2.materialDescription = 'Material 1';
    // ----- Item
    c2.amount = 20000;
    c2.passage = 11;
    c2.contamination = 'something';
    c2.source = 'IPB';
    c2.growthMedium = 'unknown';
    c2.itemDescription = 'Cellline is contamined!!!';
    c2.itemName = 'CellLine 001-002';
    c2.short_label = 'FMA-002';

    const c3 = CellLine.buildEmpty(0, 'FYA-C3');
    c3.cellLineName = 'Cell line 123';
    c3.cellLineId = 1;
    c3.id = '3';
    c3.gender = 'male';
    c3.organism = 'Mensch';
    c3.tissue = 'Lunge';
    c3.cellType = 'primary cells';
    c3.mutation = 'none';
    c3.disease = 'lung cancer';
    c3.bioSafetyLevel = 'S1';
    c3.variant = 'S1';
    c3.optimalGrowthTemperature = 36;
    c3.cryopreservationMedium = 'unknown';
    c3.name = '10-15';
    c3.materialDescription = 'Material 1';
    // ----- Item
    c3.amount = 40000;
    c3.passage = 10;
    c3.contamination = 'none';
    c3.source = 'IPB';
    c3.growthMedium = 'unknown';
    c3.itemDescription = '';
    c3.itemName = 'CellLine 001-003';
    c3.short_label = 'FMA-003';

    const c4 = CellLine.buildEmpty(0, 'FYA-C4');
    c4.cellLineName = 'Cell line 456';
    c4.cellLineId = 2;
    c4.id = '4';
    c4.organism = 'Mouse';
    c4.tissue = 'colon';
    c4.gender = 'male';
    c4.cellType = 'primary cells';
    c4.mutation = 'none';
    c4.disease = 'colon cancer';
    c4.bioSafetyLevel = 'S1';
    c4.variant = 'S1';
    c4.optimalGrowthTemperature = 36;
    c4.cryopreservationMedium = 'unknown';
    c4.name = 'Mouse';
    c4.materialDescription = 'Material 2';
    c4.itemName = 'CellLine 002-001';
    // ----- Item
    c4.amount = 10000;
    c4.passage = 10;
    c4.contamination = 'none';
    c4.source = 'IPB';
    c4.growthMedium = 'unknown';
    c4.itemDescription = '';
    c4.short_label = 'FMA-004';

    const c5 = CellLine.buildEmpty(0, 'FYA-C5');
    c5.cellLineName = 'Cell line 456';
    c5.cellLineId = 2;
    c5.id = '5';
    c5.organism = 'Mouse';
    c5.tissue = 'colon';
    c5.cellType = 'primary cells';
    c5.mutation = 'none';
    c5.gender = 'male';
    c5.disease = 'colon cancer';
    c5.bioSafetyLevel = 'S1';
    c5.variant = 'S1';
    c5.optimalGrowthTemperature = 36;
    c5.cryopreservationMedium = 'unknown';
    c5.name = '10-15';
    c5.materialDescription = 'Material 2';
    // ----- Item
    c5.amount = 10000;
    c5.passage = 10;
    c5.contamination = 'none';
    c5.source = 'IPB';
    c5.growthMedium = 'unknown';
    c5.itemDescription = '';
    c5.itemName = 'CellLine 002-002';
    c5.short_label = 'FMA-005';

    CellLinesFetcher.mockData = [c1, c2, c3, c4, c5];
  }
}
