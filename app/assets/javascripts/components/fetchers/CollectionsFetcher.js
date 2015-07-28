var CollectionsFetcher = {
  fetchRoots() {
    var promise = fetch('/api/v1/collections/roots.json')
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

module.exports = CollectionsFetcher;
