import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class PeriodicTableFetcher {
  static fetchSymbols() {
    return ApiClient.getJson('/api/v1/molecules/element_symbols');
  }
}
