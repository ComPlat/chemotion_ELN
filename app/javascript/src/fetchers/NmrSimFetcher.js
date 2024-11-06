import 'whatwg-fetch';

export default class NmrSimFetcher {
  static fetchNmrdbById(id) {
    const promise = fetch(`/api/v1/simulation/nmrdb?molecule_id=${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.json()).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
