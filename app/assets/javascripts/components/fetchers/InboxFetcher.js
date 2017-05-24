export default  class InboxFetcher{

  static fetchInbox() {
    let promise = fetch('/api/v1/inbox', {
        credentials: 'same-origin'
      })
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
