export default class GenericDSsFetcher {
  static fetchKlass() {
    return fetch('/api/v1/generic_dataset/klasses.json', {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
