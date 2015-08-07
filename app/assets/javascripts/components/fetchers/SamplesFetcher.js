import 'whatwg-fetch';

// TODO: SamplesFetcher also updates Samples and so on...naming?
export default class SamplesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/samples/' + id + '.json')
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id) {
    let promise = fetch('/api/v1/collections/' + id + '/samples.json')
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static update(paramObj) {
    let promise = fetch('/api/v1/samples/' + paramObj.id, {
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: paramObj.name
      })
    })

    return promise;
  }
}
