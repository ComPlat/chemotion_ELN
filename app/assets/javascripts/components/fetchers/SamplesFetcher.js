// TODO: SamplesFetcher also updates Samples and so on...naming?
var SamplesFetcher = {
  fetchById(id) {
    var promise = fetch('/api/v1/samples/' + id + '.json')
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  },

  fetchByCollectionId(id) {
    var promise = fetch('/api/v1/collections/' + id + '/samples.json')
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  },

  update(paramObj) {
    var promise = fetch('/api/v1/samples/' + paramObj.id, {
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

module.exports = SamplesFetcher;
