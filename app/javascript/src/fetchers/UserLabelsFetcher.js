/* eslint-disable camelcase */
import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class UserLabelsFetcher {
  static listUserLabels() {
    return ApiClient.getJson('/api/v1/user_labels/list_labels');
  }

  static updateUserLabel(params = {}) {
    return ApiClient.putJson('/api/v1/user_labels/save_label', { body: params });
  }

  static bulkUpdate({ ui_state, add_label_ids = [], remove_label_ids = [] }) {
    const body = {
      ui_state,
      add_label_ids,
      remove_label_ids,
    };

    return ApiClient.postJson('/api/v1/user_labels/bulk', {
      body,
      handleResponseSuccess: (response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text || `Request failed with status ${response.status}`);
          });
        }
        return response;
      }
    });
  }
}
