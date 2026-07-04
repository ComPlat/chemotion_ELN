import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class AdminFetcher {
  static fetchLocalCollector() {
    return ApiClient.getJson('/api/v1/admin/listLocalCollector/all');
  }

  static checkDiskSpace() {
    return ApiClient.getJson('/api/v1/admin/disk');
  }

  static getAllocatedUserSpace() {
    return ApiClient.getJson('/api/v1/admin/usersDefault');
  }

  static setAllocatedUserSpace(allocatedUserSpace) {
    return ApiClient.putJson('/api/v1/admin/usersDefault', { body: allocatedUserSpace });
  }

  static resetUserPassword(params) {
    const { userId, ...otherParams } = params;
    return ApiClient.putJson(`/api/v1/admin/users/${userId}/resetPassword/`, { body: otherParams });
  }

  static createUserAccount(params) {
    return ApiClient.postJson('/api/v1/admin/users', { body: params });
  }

  static enableDisableOtp({ enable, id }) {
    return ApiClient.putJson(`/api/v1/admin/users/${id}/otp`, { body: { enable } });
  }

  static updateUser(params) {
    const { id, ...otherParams } = params;
    return ApiClient.putJson(`/api/v1/admin/users/${id}`, { body: otherParams });
  }

  static deleteUser({ id }) {
    return ApiClient.deleteRequest(`/api/v1/admin/users/${id}`);
  }

  static restoreAccount(params) {
    return ApiClient.postJson('/api/v1/admin/users/restoreAccount/', { body: params });
  }

  static fetchUsers(id = null) {
    const url = id ? `/api/v1/admin/users/${id}` : '/api/v1/admin/users';

    return ApiClient.getJson(url);
  }

  static fetchUsersByNameType(name, type, limit = 5) {
    const params = new URLSearchParams({ name, type, limit });

    return ApiClient.getJson(`/api/v1/admin/users/byname.json?${params}`);
  }

  static updateAccount(params) {
    const { userId, ...otherParams } = params;

    return ApiClient.putJson(`/api/v1/admin/users/${userId}/profile/`, { body: otherParams });
  }

  /**
   * Enables/disables OLS terms. The endpoint replies 204 No Content, so success
   * is read from the HTTP status.
   *
   * @param {object} params - { owl_name, enableIds, disableIds }
   * @returns {Promise<boolean>} true on success (see ChemotionApiClient.apiRequest)
   */
  static olsTermDisableEnable(params) {
    return ApiClient.postJson('/api/v1/admin/olsEnableDisable/', {
      body: params,
      handleResponseSuccess: (response) => response.ok,
    });
  }

  static importOlsTerms(file) {
    const data = new FormData();
    data.append('file', file);

    return ApiClient.postFormData('/api/v1/admin/importOlsTerms/', { body: data });
  }

  static fetchGroupsDevices(type) {
    return ApiClient.getJson(`/api/v1/admin/group_device/list?type=${type}`);
  }

  static updateGroup(params = {}) {
    return ApiClient.putJson(`/api/v1/admin/group_device/update/${params.id}`, { body: params });
  }

  static deleteGroupRelation(params = {}) {
    return ApiClient.putJson(`/api/v1/admin/group_device/delete_relation/${params.id}`, { body: params });
  }

  static createGroupDevice(params = {}) {
    return ApiClient.postJson('/api/v1/admin/group_device/create', { body: params });
  }

  static fetchMatrices() {
    return ApiClient.getJson('/api/v1/admin/matrix');
  }

  static updateMatrice(params) {
    return ApiClient.putJson('/api/v1/admin/matrix', { body: params });
  }

  static fetchJobs() {
    return ApiClient.getJson('/api/v1/admin/jobs');
  }

  static restartJob(id) {
    return ApiClient.putJson('/api/v1/admin/jobs/restart/', { body: { id } });
  }

  // ── Admin LLM configuration ──────────────────────────────────────────────────

  static fetchLlmConfig() {
    return fetch('/api/v1/admin/llm_config', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  static updateLlmConfig(params) {
    return fetch('/api/v1/admin/llm_config', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  static testLlmConfig(params = {}) {
    return fetch('/api/v1/admin/llm_config/test', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  static fetchLlmModels() {
    return fetch('/api/v1/admin/llm_config/models', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  static fetchLlmUsers() {
    return fetch('/api/v1/admin/llm_users', {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  static setUserLlmEnabled(params) {
    return fetch('/api/v1/admin/llm_users', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }

  // Configurable provider presets (config/llm_provider_profiles.yml). Resolves to
  // [] on error so the preset picker just hides.
  static fetchLlmProviderProfiles() {
    return fetch('/api/v1/llm/provider_profiles', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d) => d.profiles || [])
      .catch(() => []);
  }

  // Delete the saved global provider API key.
  static deleteLlmApiKey() {
    return fetch('/api/v1/admin/llm_config/api_key', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      if (!response.ok) {
        return response.json().then((err) => { throw new Error(err.error || response.statusText); });
      }
      return response.json();
    });
  }
}
