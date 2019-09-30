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
}
