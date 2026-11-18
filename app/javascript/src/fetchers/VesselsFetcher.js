/* eslint-disable camelcase */
import ApiClient from 'src/api_clients/ChemotionApiClient';
import Vessel from 'src/models/vessel/Vessel';
import { rootStore } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

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
  autoDismiss: 10,
  position: 'tr'
};

const successfullyCreatedBulkParameter = (count) => ({
  title: 'Element created',
  message: `${count} vessel instance${count > 1 ? 's' : ''} successfully added`,
  level: 'info',
  autoDismiss: 10,
  position: 'tr'
});

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Vessel instance successfully updated',
  level: 'info',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyDeletedParameter = {
  title: 'Element deleted',
  message: 'Vessel instance successfully deleted',
  level: 'info',
  autoDismiss: 10,
  position: 'tr'
};

const errorMessageParameter = {
  title: 'Error',
  message: 'Unfortunately, the last action failed. Please try again or contact your admin.',
  level: 'error',
  autoDismiss: 30,
  position: 'tr'
};

export default class VesselsFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/vessels?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.vessels.map((vessel) => (Vessel.createFromRestResponse(id, vessel))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
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
      .then((json) => this.vesselTemplateElement(json, collectionId));
  }

  static fetchEmptyVesselTemplate() {
    return ApiClient.getJson('/api/v1/vessels/templates/new')
      .then((json) => Vessel.createFromRestResponse(0, json));
  }

  static createVesselTemplate(vessel) {
    return ApiClient.postJson('/api/v1/vessels/templates/create', {
      body: extractCreateVesselTemplateApiParameter(vessel),
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error('Failed to create vessel template');
      },
      handleResponseError: (exception) => {
        console.error('Template creation failed::', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
      }
    })
      .then((json) => {
        if (json) {
          const { currentCollection } = UIStore.getState();
          rootStore.notificationsStore.add(successfullyCreatedParameter);
          return this.vesselTemplateElement(json, currentCollection?.id);
        }
        return [];
      });
  }

  static createVesselInstance(vessel) {
    return ApiClient.postJson('/api/v1/vessels/instances/create', {
      body: extractCreateVesselInstanceApiParameter(vessel),
      handleResponseError: (exception) => {
        console.error('Vessel instance creation failed:', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
      }
    })
      .then((json) => {
        rootStore.notificationsStore.add(successfullyCreatedParameter);
        UserStore.getState().currentUser.vessels_count += 1;
        return Vessel.createFromRestResponse(vessel.collectionId, json);
      });
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
    return ApiClient.putJson(`/api/v1/vessels/templates/${templateId}`, {
      body: extractUpdateVesselTemplateApiParameter(updatedData),
      handleResponseError: (exception) => {
        console.error('Error updating vessel template:', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
      }
    })
      .then((json) => {
        rootStore.notificationsStore.add(successfullyUpdatedParameter);
        return this.vesselTemplateElement(json, collectionId);
      });
  }

  static updateVesselInstance(updatedData) {
    return ApiClient.putJson(`/api/v1/vessels/${updatedData.id}`, {
      body: extractUpdateVesselApiParameter(updatedData),
      handleResponseError: (exception) => {
        console.error('Error updating vessel instance:', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
      }
    })
      .then((json) => {
        rootStore.notificationsStore.add(successfullyUpdatedParameter);
        return Vessel.createFromRestResponse(0, json);
      });
  }

  static deleteVesselInstance(vesselId) {
    return ApiClient.deleteRequest(`/api/v1/vessels/${vesselId}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          rootStore.notificationsStore.add(successfullyDeletedParameter);
          return response.json();
        }
        throw new Error(`Failed to delete vessel. Status: ${response.status}`);
      },
      handleResponseError: (exception) => {
        console.error('Error deleting vessel instance:', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
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
        if (response.ok) { return response.json(); }
        throw new Error('Bulk create failed');
      },
      handleResponseError: (exception) => {
        console.error('Bulk vessel instance creation error:', exception);
        rootStore.notificationsStore.add(errorMessageParameter);
      }
    })
      .then((json) => {
        const vessels = Array.isArray(json)
          ? json.map((v) => Vessel.createFromRestResponse(collectionId, v))
          : [];

        rootStore.notificationsStore.add(successfullyCreatedBulkParameter(count));
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

  static vesselTemplateElement(json, collectionId) {
    if (json.error) { throw new Error(json.error); }

    const vessels = Vessel.createFromTemplateResponse(collectionId, json);
    vessels.forEach((vessel, idx) => {
      // eslint-disable-next-line no-param-reassign
      vessel.type = idx === 0 ? 'vessel_template' : 'vessel';
    });
    return vessels;
  }
}
