import Vessel from 'src/models/vessel/Vessel';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

// eslint-disable-next-line max-len
import { extractCreateVesselApiParameter, extractUpdateVesselApiParameter, storeLatestVesselIds } from 'src/utilities/VesselUtilities';

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
      .then((json) => {
        const result = Vessel.createFromRestResponse(0, json);
        return Array.isArray(result) ? result[0] : result;
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchVesselTemplateById(id, collectionId) {
    // eslint-disable-next-line max-len
    const url = `/api/v1/vessels/templates/${id}${collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : ''}`;

    return fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error fetching vessel template: ${response.statusText}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  static create(vessel, user) {
    const params = extractCreateVesselApiParameter(vessel);

    return VesselsFetcher.uploadAttachments(vessel)
      .then(() => fetch('/api/v1/vessels', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(params)
      }))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        const vessels = Array.isArray(json)
          ? json.map((item) => Vessel.createFromRestResponse(params.collection_id, item))
          : [Vessel.createFromRestResponse(params.collection_id, json)];
        const newVesselIds = vessels.map((v) => v.id).filter(Boolean);
        storeLatestVesselIds(newVesselIds);

        vessels.forEach(() => NotificationActions.add(successfullyCreatedParameter));
        user.vessels_count += vessels.length;

        return vessels;
      })
      .catch((error) => {
        console.error('Vessel creation failed:', error);
        NotificationActions.add(errorMessageParameter);
        return vessel;
      });
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

  static suggestVesselName(params) {
    const { details, vessel_type, material_type } = params;
    const queryString = new URLSearchParams({
      details,
      vessel_type,
      material_type,
    }).toString();

    console.log(queryString);

    return fetch(`/api/v1/vessels/suggest/suggest_name/${queryString}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET',
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error fetching vessel name suggestions:', error);
      });
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
    const params = extractUpdateVesselApiParameter(vesselItem);
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
      .then(() => { BaseFetcher.updateAnnotationsInContainer(vesselItem); })
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

  static lastCreatedVesselIds = new Set();

  static isValidVesselId(id) {
    return this.lastCreatedVesselIds.has(id);
  }
}
