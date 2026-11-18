import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class GenericBaseFetcher {
  static deActivateKlass(params) {
    return ApiClient.postJson('/api/v1/generic_elements/de_activate_klass', { body: params });
  }

  static deleteKlass(params) {
    return ApiClient.deleteRequest(`/api/v1/generic_elements/delete_klass/${params.id}`, {
      body: JSON.stringify(params)
    });
  }

  static deleteKlassRevision(params) {
    return ApiClient.postJson('/api/v1/generic_elements/delete_klass_revision', { body: params });
  }

  static fetchKlassRevisions(id, klass) {
    return ApiClient.getJson(`/api/v1/generic_elements/klass_revisions?${new URLSearchParams({ id, klass })}`);
  }

  static fetchUnitsSystem() {
    return ApiClient.getJson('/units_system/units_system');
  }
}
