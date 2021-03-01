export default class InboxFetcher {
  static fetchInbox(isCntOnly = false) {
    const promise = fetch(`/api/v1/inbox?cnt_only=${isCntOnly}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchMatchingSamples(searchString) {
    const promise = fetch(`/api/v1/inbox/samples?search_string=${searchString}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
