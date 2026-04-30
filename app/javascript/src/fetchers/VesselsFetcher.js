/* eslint-disable camelcase */
import ApiClient from 'src/api_clients/ChemotionApiClient';
import Vessel from 'src/models/vessel/Vessel';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';

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
  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'vessels', Vessel);
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/vessels/${id}`)
      .then((json) => {
        const result = Vessel.createFromRestResponse(0, json);
        return Array.isArray(result) ? result[0] : result;
      });
  }

  static fetchVesselTemplateById(id, collectionId) {
    const encodedCollectionId = collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : '';
    return ApiClient.getJson(`/api/v1/vessels/templates/${id}${encodedCollectionId}`)
      .then((json) => {
        if (json.error) { throw new Error(json.error); }
        return this.vesselsWithType(collectionId, json);
      });
  }

  static fetchEmptyVesselTemplate() {
    return ApiClient.getJson('/api/v1/vessels/templates/new')
      .then((json) => Vessel.createFromRestResponse(0, json));
  }

  static createVesselTemplate(vessel) {
    return this.uploadAttachments(vessel)
      .then(() => ApiClient.postJson('/api/v1/vessels/templates/create', {
        body: extractCreateVesselTemplateApiParameter(vessel),
        handleResponseSuccess: (response) => {
          if (response.ok === false) {
            throw new Error('Failed to create vessel template');
          }
          return response.json();
        },
        handleResponseError: (exception) => {
          console.error('Template creation failed::', exception);
          NotificationActions.add(errorMessageParameter);
        }
      }))
      .then((json) => {
        if (json) {
          const { currentCollection } = UIStore.getState();
          NotificationActions.add(successfullyCreatedParameter);
          return this.fetchVesselTemplateById(json.id, currentCollection?.id);
        }
        return [];
      });
  }

  static createVesselInstance(vessel) {
    const body = extractCreateVesselInstanceApiParameter(vessel);
    return ApiClient.postJson('/api/v1/vessels/instances/create', {
      body,
      handleResponseError: (exception) => {
        console.error('Vessel instance creation failed:', exception);
        NotificationActions.add(errorMessageParameter);
      }
    })
      .then((json) => {
        NotificationActions.add(successfullyCreatedParameter);
        UserStore.getState().currentUser.vessels_count += 1;
        return Vessel.createFromRestResponse(vessel.collectionId, json);
      });
  }

  static vesselsWithType(collectionId, json) {
    const vessels = Vessel.createFromTemplateResponse(collectionId, json);
    vessels.forEach((vessel, idx) => {
      // eslint-disable-next-line no-param-reassign
      vessel.type = idx === 0 ? 'vessel_template' : 'vessel';
    });
    return vessels;
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
    return ApiClient.getJson('/api/v1/vessels/names/all');
  }

  static suggestVesselName(params) {
    const { details, vessel_type, material_type } = params;
    const queryString = new URLSearchParams({
      details,
      vessel_type,
      material_type,
    }).toString();

    return ApiClient.getJson(`/api/v1/vessels/suggest/suggest_name/${queryString}`);
  }

  static getVesselMaterialById(id) {
    return ApiClient.getJson(`/api/v1/vessels/material/${id}`);
  }

  static updateVesselTemplate(templateId, updatedData, collectionId) {
    const body = extractUpdateVesselTemplateApiParameter(updatedData);

    return this.uploadAttachments(updatedData)
      .then(() => ApiClient.putJson(`/api/v1/vessels/templates/${templateId}`, {
        body,
        handleResponseError: (exception) => {
          console.error('Error updating vessel template:', exception);
          NotificationActions.add(errorMessageParameter);
        }
      }))
      .then((json) => {
        if (updatedData?.container?.attachments) {
          BaseFetcher.updateAnnotationsInContainer(updatedData);
        }
        NotificationActions.add(successfullyUpdatedParameter);
        return this.vesselsWithType(collectionId, json);
      });
  }

  static updateVesselInstance(updatedData) {
    const body = extractUpdateVesselApiParameter(updatedData);
    return ApiClient.putJson(`/api/v1/vessels/${updatedData.id}`, {
      body,
      handleResponseError: (exception) => {
        console.error('Error updating vessel instance:', exception);
        NotificationActions.add(errorMessageParameter);
      }
    })
      .then((json) => {
        NotificationActions.add(successfullyUpdatedParameter);
        return Vessel.createFromRestResponse(0, json);
      });
  }

  static deleteVesselInstance(vesselId) {
    return ApiClient.deleteRequest(`/api/v1/vessels/${vesselId}`, {
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          throw new Error(`Failed to delete vessel. Status: ${response.status}`);
        }
        NotificationActions.add(successfullyDeletedParameter);
        return response.json();
      },
      handleResponseError: (exception) => {
        console.error('Error deleting vessel instance:', exception);
        NotificationActions.add(errorMessageParameter);
      }
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

    return ApiClient.postJson('/api/v1/vessels/bulk_create', {
      body,
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          throw new Error('Bulk create failed');
        }
        return response.json();
      },
      handleResponseError: (exception) => {
        console.error('Bulk vessel instance creation error:', exception);
        NotificationActions.add(errorMessageParameter);
      }
    })
      .then((json) => {
        const vessels = Array.isArray(json)
          ? json.map((v) => Vessel.createFromRestResponse(collectionId, v))
          : [];

        NotificationActions.add(successfullyCreatedBulkParameter(count));
        // eslint-disable-next-line no-param-reassign
        if (user) user.vessels_count += vessels.length;
        ElementActions.refreshElements('vessel');
        return vessels;
      });
  }

  static lastCreatedVesselIds = new Set();

  static isValidVesselId(id) {
    return this.lastCreatedVesselIds.has(id);
  }
}
