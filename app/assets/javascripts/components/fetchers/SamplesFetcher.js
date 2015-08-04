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
  }
}

module.exports = SamplesFetcher;
