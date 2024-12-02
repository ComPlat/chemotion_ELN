import Vessel from 'src/models/vessel/Vessel';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

import {extractVesselApiParameter} from 'src/utilities/VesselUtilities';

const successfullyCreatedParameter = {
  title: 'Element created',
  message: 'Vessel instance successfully added',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Vessel instance successfully updated',
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

export default class VesselsFetcher {
  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'vessels', Vessel);
  }

  static fetchById(id) {
    const promise = fetch(`/api/v1/vessels/${id}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
      .then((response) => response.json())
      .then((json) => Vessel.createFromRestResponse(0, json))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static create(vessel, user) {
    const params = extractVesselApiParameter(vessel);

    // const promise = VesselsFetcher.uploadAttachments(vessel)
    const promise = fetch('/api/v1/vessels', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(params)  
    })

      .then((response) => response.json())
    //   .then((json) => { GenericElsFetcher.uploadGenericFiles(cellLine, json.id, 'CellLineSample'); return json; })
      .then((json) => Vessel.createFromRestResponse(params.collection_id, json))
      .then((vesselItem) => {
        NotificationActions.add(successfullyCreatedParameter);
        user.vessels_count = user.vessels_count +1;
        return vesselItem;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return vessel;
      });

    return promise;
  }

  static uploadAttachments(vessel) {
    const files = AttachmentFetcher.getFileListfrom(vessel.container);

    if (files.length > 0) {
      const tasks = [];
      files.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => {
        Promise.resolve(1);
      });
    }
    return Promise.resolve(1);
  }

  static getAllVesselNames() {
    return fetch('/api/v1/vessels/names/all', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => response.json());
  }

  static getVesselMaterialById(id) {
    return fetch(`/api/v1/vessels/material/${id}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => response.json());
  }

  static update(vesselItem) {
    const params = extractVesselApiParameter(vesselItem);
    const promise = VesselsFetcher.uploadAttachments(vesselItem)
      .then(() => fetch('/api/v1/vessels', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'PUT',
        body: JSON.stringify(params)
      }))
      .then((response) => response.json())
    //   .then(() => {BaseFetcher.updateAnnotationsInContainer(cellLineItem)})
      .then(() => VesselsFetcher.fetchById(vesselItem.id))
      .then((loadedVesselInstance) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return loadedVesselInstance;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add(errorMessageParameter);
        return vesselItem;
      });
    return promise;
  }
}
