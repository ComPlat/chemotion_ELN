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
  // ── AI / LLM Settings ──────────────────────────────────────────────────────

  static fetchLlmSettings() {
    return fetch('/api/v1/users/llm_settings', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then((response) => response.json())
      .catch((error) => {
        console.error('fetchLlmSettings error:', error);
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
  static updateLlmSettings(params = {}) {
    return fetch('/api/v1/users/llm_settings', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || body.message || `HTTP ${response.status}`);
          });
        }
        return response.json();
      })
      .catch((error) => {
        console.error('updateLlmSettings error:', error);
        throw error;
      });
  }

  static verifyLlmApiKey(params = {}) {
    return fetch('/api/v1/users/llm_settings/verify', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => { throw new Error(body.error || body.message || 'Verification failed'); });
        }
        return response.json();
      })
      .catch((error) => {
        console.error('verifyLlmApiKey error:', error);
        throw error;
      });
  }

  static fetchLlmModels() {
    return fetch('/api/v1/users/llm_settings/models', { credentials: 'same-origin' })
      .then((r) => r.json())
      .catch(() => ({ models: [] }));
  }

  // Models offered by the institution (global) provider — for the Task→Model
  // dropdown when the user is on the institution service. Returns [] if the
  // provider exposes no list (caller falls back to free-text / default model).
  static fetchInstitutionLlmModels() {
    return fetch('/api/v1/llm/institution_models', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => d.models || [])
      .catch(() => []);
  }

  // Models for a supplied (pre-save) custom config. Used to (re)populate the
  // Task→Model dropdown after a successful Test connection or on load. A blank
  // api_key tells the server to reuse the user's saved key. Returns [].
  static fetchLlmModelsForConfig({ protocol, baseUrl, model, apiKey } = {}) {
    return fetch('/api/v1/users/llm_settings/models', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        protocol,
        base_url: baseUrl,
        model,
        api_key: apiKey,
      }),
    })
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => d.models || [])
      .catch(() => []);
  }

  // Fetch all registered LLM task definitions from the Task Registry (SF-04).
  // Returns an array of task metadata objects: [{ name, display_name, category, ... }]
  // Resolves to [] on error so callers can fall back gracefully.
  static fetchLlmTasks() {
    return fetch('/api/v1/llm/tasks', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }

  // Fetch configurable provider presets (config/llm_provider_profiles.yml).
  // Resolves to [] on error so the preset picker just hides.
  static fetchLlmProviderProfiles() {
    return fetch('/api/v1/llm/provider_profiles', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d) => d.profiles || [])
      .catch(() => []);
  }

  // Which AI access gates the current user is granted (drives AI-settings tab
  // visibility). Fails closed (no access) on error.
  static fetchLlmAccess() {
    const denied = { institution_allowed: false, personal_allowed: false, any_allowed: false };
    return fetch('/api/v1/llm/access', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : denied))
      .catch(() => denied);
  }

  // Delete the current user's saved personal API key.
  static deleteLlmApiKey() {
    return fetch('/api/v1/users/llm_settings/api_key', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((body) => {
            throw new Error(body.error || body.message || `HTTP ${response.status}`);
          });
        }
        return response.json();
      })
      .catch((error) => {
        console.error('deleteLlmApiKey error:', error);
        throw error;
      });
  }
}

