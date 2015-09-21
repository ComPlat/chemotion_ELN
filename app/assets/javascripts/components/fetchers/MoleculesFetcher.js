import 'whatwg-fetch';

export default class MoleculesFetcher {
  static fetchByMolfile(molfile) {
    let promise = fetch(`/api/v1/molecules?molfile=${molfile}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json();
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}