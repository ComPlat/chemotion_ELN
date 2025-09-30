/* eslint-disable camelcase */
import Vessel from 'src/models/vessel/Vessel';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';

// eslint-disable-next-line max-len
import {
  extractCreateVesselTemplateApiParameter,
  extractCreateVesselInstanceApiParameter,
  extractUpdateVesselTemplateApiParameter,
  extractUpdateVesselApiParameter,
} from 'src/utilities/VesselUtilities';

const successfullyCreatedParameter = {
  title: 'Element created',
  message: 'Vessel instance successfully added',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyCreatedBulkParameter = (count) => ({
  title: 'Element created',
  message: `${count} vessel instance${count > 1 ? 's' : ''} successfully added`,
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
});

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Vessel instance successfully updated',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyDeletedParameter = {
  title: 'Element deleted',
  message: 'Vessel instance successfully deleted',
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
      .then((response) => response.json())
      .then((json) => {
        const vessels = Vessel.createFromTemplateResponse(collectionId, json);
        vessels.forEach((v, idx) => {
          v.type = idx === 0 ? 'vessel_template' : 'vessel';
        });
        return vessels;
      })
      .catch((error) => {
        console.error('Error fetching vessel template by ID:', error);
        return [];
      });
  }

  static fetchEmptyVesselTemplate() {
    const promise = fetch('/api/v1/vessels/templates/new', {
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

  static createVesselTemplate(vessel) {
    return VesselsFetcher.uploadAttachments(vessel)
      .then(() => {
        const params = extractCreateVesselTemplateApiParameter(vessel);
        return fetch('/api/v1/vessels/templates/create', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create vessel template');
        return res.json();
      })
      .then((templateJson) => {
        const { id } = templateJson;
        const { currentCollection } = UIStore.getState();
        const collectionId = currentCollection?.id;
  
        return VesselsFetcher.fetchVesselTemplateById(id, collectionId);
      })
      .then((fullTemplateGroup) => {
        NotificationActions.add(successfullyCreatedParameter);
        return fullTemplateGroup;
      })
      .catch((err) => {
        console.error('Template creation failed:', err);
        NotificationActions.add(errorMessageParameter);
      });
  }

  static createVesselInstance(vessel, user) {
    
    const params = extractCreateVesselInstanceApiParameter(vessel);

    return fetch('/api/v1/vessels/instances/create', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then((res) => res.json())
      .then((json) => {
        const instance = Vessel.createFromRestResponse(vessel.collectionId, json);
        NotificationActions.add(successfullyCreatedParameter);
        UserStore.getState().currentUser.vessels_count += 1;
        return instance;
      })
      .catch((err) => {
        console.error('Vessel instance creation failed:', err);
        NotificationActions.add(errorMessageParameter);
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

  static updateVesselTemplate(templateId, updatedData, collectionId) {
    const params = extractUpdateVesselTemplateApiParameter(updatedData);
  
    return VesselsFetcher.uploadAttachments(updatedData)
      .then(() => fetch(`/api/v1/vessels/templates/${templateId}`, {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'PUT',
        body: JSON.stringify(params),
      }))
      .then((response) => response.json())
      .then(() => {
        if (updatedData?.container?.attachments) {
          BaseFetcher.updateAnnotationsInContainer(updatedData);
        }
      })
      .then(() => VesselsFetcher.fetchVesselTemplateById(templateId, collectionId))
      .then((loadedVesselInstance) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return loadedVesselInstance;
      })
      .catch((errorMessage) => {
        console.error('Error updating vessel template:', errorMessage);
        NotificationActions.add(errorMessageParameter);
      });
  }

  static updateVesselInstance(updatedData) {
    const params = extractUpdateVesselApiParameter(updatedData);
    return fetch(`/api/v1/vessels/${updatedData.id}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then(() => VesselsFetcher.fetchById(updatedData.id))
      .then((loadedVesselInstance) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return loadedVesselInstance;
      })
      .catch((errorMessage) => {
        console.error('Error updating vessel instance:', errorMessage);
        NotificationActions.add(errorMessageParameter);
      });
  }

  static deleteVesselInstance(vesselId) {
    return fetch(`/api/v1/vessels/${vesselId}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to delete vessel. Status: ${response.status}`);
        }
        NotificationActions.add(successfullyDeletedParameter);
        return response.json();
      })
      .catch((error) => {
        console.error('Error deleting vessel instance:', error);
        NotificationActions.add(errorMessageParameter);
      });
  }

  static bulkCreateInstances({
    vesselTemplateId,
    collectionId,
    count,
    baseName,
    container,
    shortLabels,
    user
  }) {
    const body = {
      vessel_template_id: vesselTemplateId,
      collection_id: collectionId,
      count,
      base_name: baseName,
      container,
      short_labels: shortLabels
    };

    return fetch('/api/v1/vessels/bulk_create', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Bulk create failed');
        return res.json();
      })
      .then((json) => {
        const vessels = Array.isArray(json)
          ? json.map((v) => Vessel.createFromRestResponse(collectionId, v))
          : [];

        NotificationActions.add(successfullyCreatedBulkParameter(count));
        if (user) user.vessels_count += vessels.length;
        ElementActions.refreshElements('vessel');
        return vessels;
      })
      .catch((err) => {
        console.error('Bulk vessel instance creation error:', err);
        NotificationActions.add(errorMessageParameter);
      });
  }

  static lastCreatedVesselIds = new Set();

  static isValidVesselId(id) {
    return this.lastCreatedVesselIds.has(id);
  }
}
