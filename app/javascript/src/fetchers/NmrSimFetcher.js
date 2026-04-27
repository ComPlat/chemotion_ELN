import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class NmrSimFetcher {
  static fetchNmrdbById(id) {
    return ApiClient.getJson(`/api/v1/simulation/nmrdb?molecule_id=${id}`);
  }
}
