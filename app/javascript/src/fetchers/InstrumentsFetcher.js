import 'whatwg-fetch';

export default class InstrumentsFetcher {
  static fetchInstrumentsForCurrentUser(query) {
    return fetch(
      `/api/v1/instruments/${encodeURIComponent(query)}`,
      { credentials: 'same-origin' }
    ).then(response => response.json())
      .then(json => json.instruments)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
