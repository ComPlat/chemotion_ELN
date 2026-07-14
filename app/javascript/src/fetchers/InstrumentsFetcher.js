import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class InstrumentsFetcher {
  static fetchInstrumentsForCurrentUser(query) {
    return ApiClient.getJson(`/api/v1/instruments/${encodeURIComponent(query)}`)
      .then((json) => json.instruments);
  }
}
