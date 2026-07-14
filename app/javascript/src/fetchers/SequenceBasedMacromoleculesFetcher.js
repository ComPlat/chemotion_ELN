import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class SequenceBasedMacromoleculesFetcher {
  static searchForSequenceBasedMacromolecule(searchTerm, searchField) {
    const urlParams = new URLSearchParams({ search_term: searchTerm, search_field: searchField });
    return ApiClient.getJson(`/api/v1/sequence_based_macromolecules?${urlParams}`);
  }

  static getSequenceBasedMacromoleculeByIdentifier(identifier, type) {
    return ApiClient.getJson(`/api/v1/sequence_based_macromolecules/${identifier}?type=${type}`);
  }

  static changeRequestForSequenceBasedMacromolecule(sbmmParams) {
    return ApiClient.postJson('/api/v1/sequence_based_macromolecules/change_request', { body: sbmmParams });
  }
}
