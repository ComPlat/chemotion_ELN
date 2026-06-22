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

  static fetchAffiliationSuggestions(status) {
    return ApiClient.getJson(`/api/v1/admin/affiliation_suggestions?status=${status}`);
  }

  static updateAffiliationSuggestion(id, action) {
    return ApiClient.putJson(`/api/v1/admin/affiliation_suggestions/${id}/${action}`, { body: {} });
  }
}
