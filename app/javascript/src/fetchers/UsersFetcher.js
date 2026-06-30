/* eslint-disable arrow-parens */
import ApiClient from 'src/api_clients/ChemotionApiClient';
import DocumentHelper from 'src/utilities/DocumentHelper';

class ResponseError extends Error {
  constructor(response) {
    super(`${response.status} ${response.statusText}`);
    this.status = response.status;
    this.response = response;
  }

  json() {
    return this.response.json();
  }
}

// TODO: SamplesFetcher also updates Samples and so on...naming?
export default class UsersFetcher {
  static fetchElementKlasses(genericOnly = true) {
    let api = '/api/v1/generic_elements/klasses';
    if (genericOnly) {
      api = '/api/v1/generic_elements/klasses?generic_only=true';
    }
    return ApiClient.getJson(api);
  }

  static fetchElementKlassNames(genericOnly = true) {
    let api = '/api/v1/labimotion_hub/element_klasses_name';
    if (genericOnly) {
      api = '/api/v1/labimotion_hub/element_klasses_name?generic_only=true';
    }

    return ApiClient.getJson(api);
  }

  static fetchOmniauthProviders() {
    return ApiClient.getJson('/api/v1/public/omniauth_providers');
  }

  static fetchUsersByName(name, type = 'Person') {
    return ApiClient.getJson(`/api/v1/users/name?${new URLSearchParams({ name, type })}`);
  }

  static fetchCurrentUser() {
    return ApiClient.getJson('/api/v1/users/current');
  }

  static fetchProfile() {
    return ApiClient.getJson('/api/v1/profiles');
  }

  static updateUserProfile(params = {}) {
    return ApiClient.putJson('/api/v1/profiles', { body: params });
  }

  static fetchNoVNCDevices(id = 0) {
    return ApiClient.getJson(`/api/v1/devices/novnc?id=${id}`)
      .then((json) => json.devices);
  }

  static createGroup(params = {}) {
    return ApiClient.postJson('/api/v1/groups/create', { body: params });
  }

  static fetchCurrentGroup() {
    return ApiClient.getJson('/api/v1/groups/qrycurrent');
  }

  static fetchCurrentDevices() {
    return ApiClient.getJson('/api/v1/groups/queryCurrentDevices');
  }

  static fetchDeviceMetadataByDeviceId(deviceId) {
    return ApiClient.getJson(`/api/v1/groups/deviceMetadata/${deviceId}`);
  }

  static fetchUserOmniauthProviders() {
    return ApiClient.getJson('/api/v1/users/omniauth_providers');
  }

  static updateGroup(params = {}) {
    const body = {
      id: params.id,
      destroy_group: params.destroy_group,
      rm_users: params.rm_users,
      add_users: params.add_users,
      add_admin: params.add_admin,
      rm_admin: params.rm_admin,
    };
    return ApiClient.putJson('/api/v1/users/omniauth_providers', { body });
  }

  static fetchOls(name, edited = true) {
    return ApiClient.getJson(`/api/v1/ols_terms/list?name=${name}&edited=${edited}`);
  }

  static listEditors() {
    return ApiClient.getJson('/api/v1/users/list_editors');
  }

  static updateUserCounter(params = {}) {
    return ApiClient.putJson('/api/v1/users/update_counter', { body: params });
  }

  static scifinderCredential() {
    return ApiClient.getJson('/api/v1/users/scifinder');
  }

  static fetchUserKetcherOptions() {
    return ApiClient.getJson('/api/v1/profiles/editors/ketcher-options');
  }

  static updateUserKetcherOptions(list) {
    const data = JSON.parse(list);
    return ApiClient.putJson('/api/v1/profiles/editors/ketcher-options', { body: data });
  }

  static updateReactionShortLabel(params) {
    return ApiClient.putJson('/api/v1/users/reaction_short_label', { body: params });
  }

  static fetch2FAQR() {
    return ApiClient.getJson('/api/v1/users/two_factor');
  }

  static fetchEnable2FAQR() {
    return ApiClient.putJson('/api/v1/users/two_factor');
  }

  static logoutUser() {
    return ApiClient.deleteRequest('/users/sign_out', {
      data: { authenticity_token: DocumentHelper.getMetaContent('csrf-token') },
      headers: {},
      handleResponseSuccess: (response) => response
    });
  }

  static submitAsForm(url, method, body) {
    const options = {
      body,
      headers: {},
      handleResponseSuccess: (response) => response
    };
    if (method === 'PUT') {
      return ApiClient.putFormData(url, options);
    }
    return ApiClient.postFormData(url, options);
  }

  static fetchRevokeAuthTokens(params) {
    return fetch('/api/v1/users/revoke_auth_token', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then((response) => {
        if (!response.ok) {
          throw new ResponseError(response);
        }

        return response.json();
      })
      .catch((error) => {
        console.error('Fetch error in users/revoke_auth_token:', error);
        throw error;
      });
  }

  static fetchNewAuthToken(params) {
    return fetch('/api/v1/users/auth_token', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then((response) => {
        if (!response.ok) {
          throw new ResponseError(response);
        }

        return response.json();
      })
      .catch((error) => {
        console.error('Fetch error in public/token:', error);
        throw error;
      });
  }
}
